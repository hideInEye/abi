#!/usr/bin/env bash

set -euo pipefail

current_pwd="$(cd "$(dirname "$0")" && pwd)"
bundle_dir="$current_pwd/abi-dist"
final_tar_file="$current_pwd/abi-dist.tar.gz"

cd "$current_pwd"
echo "当前目录: $current_pwd"

echo "开始执行构建"
npm run build

rm -rf "$bundle_dir"
rm -f "$final_tar_file"
mkdir -p "$bundle_dir"

copy_dist() {
  local app_name="$1"
  local app_dir="$current_pwd/apps/$app_name"

  if [ ! -d "$app_dir/dist" ]; then
    echo "未找到 $app_dir/dist，请确认构建是否成功"
    exit 1
  fi

  echo "复制 $app_name dist 文件"
  cp -R "$app_dir/dist" "$bundle_dir/$app_name"
}

copy_dist abi
copy_dist chat
copy_dist dashboard

cd "$current_pwd"
echo "压缩 abi-dist 目录"
tar -zcf "$final_tar_file" abi-dist
ls -l "$final_tar_file"

rm -rf "$bundle_dir"

echo "打包完成"
