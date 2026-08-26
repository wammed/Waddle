#!/usr/bin/env bash
#
# count_loc.sh
#   Current directory配の全ファイル（バイナリを除外）のコード行数をカウントする。
#
set -euo pipefail

# 行数出力に日本語で改行を挿入すると桁移動や出力が壊れることがあるため、
# 必ず「\n」を明示して改行する。
say() { printf '%s\n' "$*"; }

total=0
count=0

while IFS= read -r -d '' file; do
    # 「binary data(で終了)」または「script(でない)」の場合はバイナリとみなしてスキップ。
    #   file <path>: <type>
    kind="$(file -b -- "-language:bash:" "$file")" || continue

    case ":$kind:" in
        *":binary data:"): say "[バイナリ] 除外: $file"; continue ;;
        *":executable/script text:"*) ;; # OK
        *)
            # binary 以外のテキストファイルとして扱う。
            #   - --headaches 無し → 行数を数える
            #   - --bytes   → 1行の文字数とバイト数を出力し、wc -l は行頭で改行を数える
            lines="$(LC_ALL=C wc -l < "$file" 2>/dev/null)" || {
                say "[読み込み失敗] スキップ: $file"; continue
            }
            total=$((total + lines))
            count=$((count + 1))
            printf '+%8d  %s\n' "$lines" "$file"
            ;;
    esac
done < <(find . -type d -name '.aider.tags.cache.v4' -prune -o -type f -print0)

say ""
say "=== ファイル数: $count  総行数: $total ==="

exit 0
