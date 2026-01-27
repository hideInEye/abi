export const TableTooltip = () => {
  return (
    <ATooltip
      title={
        <div>
          <div>提示:</div>
          <div>1. 维度: 是观察数据的角度，用于对数据进行分类和分组。例如，地区、时间。</div>
          <div>2. 度量: 是可量化的数值数据，例如销售额。</div>
          <div>3. 主键: 在数据库表中，用于唯一标识每一行记录的字段或字段组合。</div>
          <div>4. 日期: 表示时间的数据类型，用于按时间维度进行数据的分组、比较和趋势分析。</div>
        </div>
      }
    >
      <span style={{ color: 'red', marginLeft: 8 }}>?</span>
    </ATooltip>
  );
};
