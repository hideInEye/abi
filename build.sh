#!/usr/bin/env bash

set -euo pipefail

current_pwd="$(cd "$(dirname "$0")" && pwd)"

cd "$current_pwd"
echo "当前目录: $current_pwd"

echo "开始执行构建"
npm run build

package_dist() {
  local app_name="$1"
  local app_dir="$current_pwd/apps/$app_name"
  local tar_file="$app_name.tar.gz"

  if [ ! -d "$app_dir/dist" ]; then
    echo "未找到 $app_dir/dist，请确认构建是否成功"
    exit 1
  fi

  cd "$app_dir"
  echo "进入到 $app_name 目录: $(pwd)"
  echo "压缩 $app_name dist 文件"
  rm -f "$tar_file"
  tar -zcf "$tar_file" dist
  ls -l "$tar_file"
}

package_dist abi
package_dist chat
package_dist dashboard

echo "打包完成"
