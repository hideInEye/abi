export function getSemanticTypeMap(initFields: any) {
  const semanticTypeMap = new Map();

  initFields.dimensions.forEach((dimension: any) => {
    if (dimension.type === 'datetime') {
      semanticTypeMap.set(dimension.techId, {
        alias: dimension.alias,
        bizName: dimension.bizName,
        fieldDesc: dimension.fieldDesc,
        semanticType: 'datetime'
      });
    } else {
      semanticTypeMap.set(dimension.techId, {
        alias: dimension.alias,
        bizName: dimension.bizName,
        fieldDesc: dimension.fieldDesc,
        semanticType: 'categorical'
      });
    }
  });

  initFields.measures.forEach((measure: any) => {
    semanticTypeMap.set(measure.techId, {
      alias: measure.alias,
      bizName: measure.bizName,
      fieldDesc: measure.fieldDesc,
      semanticType: 'measure'
    });
  });

  initFields.identifiers.forEach((identifier: any) => {
    semanticTypeMap.set(identifier.techId, {
      alias: identifier.alias,
      bizName: identifier.bizName,
      fieldDesc: identifier.fieldDesc,
      semanticType: 'primary_key'
    });
  });

  return semanticTypeMap;
}
