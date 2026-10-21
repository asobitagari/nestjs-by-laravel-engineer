#!/usr/bin/env python3
# PostToolUse フック:
#   OpenSpec の成果物（openspec/changes/**・openspec/specs/** の .md）を Claude Code が編集したら、
#   .claude/references/openspec-doc.md の書き方ルールを additionalContext として Claude に渡す。
#   - セッションで初回: ルール本文を渡す。2 回目以降: 短い準拠チェックの指示だけを渡す
#   - 編集した change / spec に `openspec validate --strict` をかけ、失敗したらその出力も渡す
#   - openspec/changes/archive/ 配下（OpenSpec CLI が移した写し）は対象外
# 登録先: .claude/settings.json（WSL / Linux / macOS 共通で動くので、コミットする共有設定に置く）
# defold-roguelike-game-first の inject-openspec-doc.ps1 を移植したもの。jq に依存しないよう Python で書く。

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    # Claude Code から渡される JSON（どのツールで、どのファイルを編集したか）
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    fp = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not fp:
        return 0

    # パスの区切りを / にそろえてから、対象のファイルかどうかを判定する
    norm = fp.replace("\\", "/")
    if not re.search(r"(?:^|/)openspec/(?:changes/(?!archive/)|specs/).+\.md$", norm):
        return 0
    # 検証対象: openspec/changes/<change>/... なら change、openspec/specs/<capability>/spec.md なら spec
    m_change = re.search(r"(?:^|/)openspec/changes/([^/]+)/", norm)
    m_spec = re.search(r"(?:^|/)openspec/specs/(.+)/spec\.md$", norm)
    change_name = m_change.group(1) if m_change else None
    spec_name = m_spec.group(1) if m_spec else None

    claude_dir = Path(__file__).resolve().parent.parent
    rule_file = claude_dir / "references" / "openspec-doc.md"
    if not rule_file.exists():
        return 0

    # セッションごとに「もうルール本文を渡したか」を一時フォルダの目印ファイルで覚える
    session_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(payload.get("session_id") or "unknown"))
    state_dir = Path(tempfile.gettempdir()) / "claude-openspec-doc"
    state_dir.mkdir(parents=True, exist_ok=True)
    state_file = state_dir / f"{session_id}.flag"

    name = os.path.basename(fp)
    if state_file.exists():
        note = (
            f"【{name} を編集 — 『OpenSpec の成果物の書き方』準拠を評価し、非準拠なら修正せよ】"
            "（本文は既出。詳細は .claude/references/openspec-doc.md を参照）"
        )
    else:
        body = rule_file.read_text(encoding="utf-8")
        note = f"【{name} を編集した — 下記『OpenSpec の成果物の書き方』に準拠しているか評価し、非準拠なら修正せよ】\n{body}"
        state_file.touch()

    note += validate(change_name, spec_name, payload.get("cwd"))

    print(json.dumps(
        {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": note}},
        ensure_ascii=False,
    ))
    return 0


def validate(change_name, spec_name, cwd) -> str:
    """編集した change / spec に openspec validate --strict をかけ、失敗したときだけ結果を返す。"""
    if change_name:
        args = ["openspec", "--no-color", "validate", change_name, "--type", "change", "--strict", "--no-interactive"]
    elif spec_name:
        args = ["openspec", "--no-color", "validate", spec_name, "--type", "spec", "--strict", "--no-interactive"]
    else:
        return ""
    try:
        r = subprocess.run(
            args,
            cwd=os.environ.get("CLAUDE_PROJECT_DIR") or cwd or None,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        # openspec が無い・遅いときは検証を諦める（ルールの注入だけは行う）
        return ""
    if r.returncode == 0:
        return ""
    out = (r.stdout + r.stderr).strip()
    # 書きかけの change（tasks.md がまだ無いなど）でも落ちるので、修正の必要は Claude に判断させる
    return f"\n\n【openspec validate {args[3]} --strict が失敗した。書きかけで未作成の成果物がある場合を除き、修正せよ】\n{out}"


if __name__ == "__main__":
    sys.exit(main())
