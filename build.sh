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

package_dist() {
  local app_name="$1"
  local app_dir="$current_pwd/apps/$app_name"
  local tar_file="$app_name.tar.gz"
  local tar_path="$app_dir/$tar_file"

  if [ ! -d "$app_dir/dist" ]; then
    echo "未找到 $app_dir/dist，请确认构建是否成功"
    exit 1
  fi

  cd "$app_dir"
  echo "进入到 $app_name 目录: $(pwd)"
  echo "压缩 $app_name dist 文件"
  tar -zcf "$tar_file" dist
  cp "$tar_path" "$bundle_dir/$tar_file"
  ls -l "$bundle_dir/$tar_file"
}

package_dist abi
package_dist chat
package_dist dashboard

cd "$current_pwd"
echo "压缩 abi-dist 目录"
tar -zcf "$final_tar_file" abi-dist
ls -l "$final_tar_file"

echo "清理中间打包文件"
rm -f "$current_pwd/apps/abi/abi.tar.gz"
rm -f "$current_pwd/apps/chat/chat.tar.gz"
rm -f "$current_pwd/apps/dashboard/dashboard.tar.gz"
rm -rf "$bundle_dir"

echo "打包完成"
