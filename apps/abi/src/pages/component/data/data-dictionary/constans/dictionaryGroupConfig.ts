export const dictionaryGroupConfig = {
  button: '添加字典分组',
  inputLabel: '字典分组名称',
  inputPlaceholder: '请输入字典分组名称',
  inputPlaceholderEn: '请输入字典分组英文名称',
  modalAddTitle: '新增字典分组',
  modalEditTitle: '编辑字典分组',
  panelTitle: '分组目录',
  // remark: '字典分组英文名称',
  rule: [
    [{ message: '请输入字典分组名称', required: true }],
    // [
    //   { message: '请输入字典英文名称', required: true },
    //   { message: '仅支持英文，数字，下划线，不支持特殊字符', pattern: /^[a-zA-Z0-9_]+$/ }
    // ]
  ],
  type: 'dictionary'
};
