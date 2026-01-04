// 意图澄清模拟数据 - 多种场景示例
export const mockIntentClarifyData = {
  // 1. 问数场景 - 明细查询
  queryDetailSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_db_execute",
        "query_mode": "query_detail",
        "confirm": {
          // "time_range": [
          //   {
          //     "text": "时间",
          //     "candidate": [
          //       {
          //         "text": "交易时间",
          //         "field": "deal_time"
          //       },
          //       {
          //         "text": "创建时间",
          //         "field": "create_time"
          //       },
          //       {
          //         "text": "监测时间",
          //         "field": "monitor_time"
          //       }
          //     ]
          //   }
          // ],
          "time_range":[
            {
              "text":"时间",
              "field":"bank_transactions_transaction_flow",
              "granularity":"年",
              "operator":"=",
              "value" :"2019",
              "isCalculated":"false",
              "candidate":[
                {
                  "text":"交易时间",
                  "field":"bank_transactions_transaction_flow",
                  "isCalculated":"false"
                },
                {
                  "text":"账单流水",
                  "field":"bank_transactions_bill_flow",
                  "isCalculated":"false"
                }]}
          ],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "蓄水量",
              "field": "XSL",
              "function": "AVG",
              "candidate": [],
              "qualifier": [
                {
                  "type": "dim",
                  "text": "水库名称",
                  "field": "SKMC",
                  "operator": "in",
                  "value": "三峡水库"
                }
              ],
              "group_filters": [ // 分组过滤条件，适用于问数
                {
                  "operator": "<",
                  "value": "50"
                },{
                  "operator": ">=",
                  "value": "20"
                }
              ]
            }
          ],
          "filters": []
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "single",
            "base_indicators": "single"
          },
          "time_range": [],
          "dimensions": [
            {
              "text": "管理单位",
              "field": "GLDW"
            }
          ],
          "target_indicators": [],
          "filters": [
            {
              "type": "dim",
              "text": "天气状况",
              "field": "TQZK",
              "operator": "in",
              "value": "前端输入"
            }
          ]
        }
      }
    ]
  },

  // 2. 问数场景 - 聚合查询
  queryAggregationSample: {
    // "agent_label": "intent_clarify",
    // "agent_step": [
    //   {
    //     "chat_mode": "chat_with_db_execute",
    //     "query_mode": "query_aggregation",
    //     "confirm": {
    //       "time_range": [],
    //       "dimensions": [
    //         {
    //           "text": "流域",
    //           "field": "LY",
    //           "candidate": [
    //             {
    //               "text": "流域",
    //               "field": "LY"
    //             },
    //             {
    //               "text": "水系",
    //               "field": "SX"
    //             }
    //           ]
    //         }
    //       ],
    //       "target_indicators": [],
    //       "filters": [
    //         {
    //           "type": "dim",
    //           "text": "天气状况",
    //           "field": "TQZK",
    //           "operator": "in",
    //           "value": "前端输入"
    //         }
    //       ]
    //     },
    //     "recommend": {
    //       "config": {
    //         "time_range": "single",
    //         "dimensions": "multiple",
    //         "target_indicators": "multiple",
    //         "base_indicators": "single"
    //       },
    //       "time_range": [
    //         {
    //           "text": "2024年第一季度",
    //           "field": "report_date",
    //           "operator": "range",
    //           "value": "2024-01-01,2024-03-31"
    //         }
    //       ],
    //       "dimensions": [],
    //       "target_indicators": [
    //         // 指标有限定约束 - 单个qualifier示例
    //         {
    //           "text": "总降水量",
    //           "field": "JSL",
    //           "function": "SUM",
    //           "qualifier": [
    //             {
    //               "type": "dim",
    //               "text": "监测站点",
    //               "field": "JCZD",
    //               "operator": "not in",
    //               "value": "废弃站点,维修站点"
    //             }
    //           ]
    //         }
    //       ],
    //       "filters": []
    //     }
    //   }
    // ]
    "agent_label": "intent_clarify",
    "extra": {
      "start_time_ms": 1761189938036
    },
    "agent_step": [
      {
        "chat_mode": "chat_with_db_execute",
        "query_mode": "query_aggregation",
        "confirm": {
          "time_range": [],
          "dimensions": [
            {
              "text": "标签为1的账号",
              "field": "",
              "isCalculated": "false"
            },
            {
              "text": "标签为2的账号",
              "field": "",
              "isCalculated": "false"
            }
          ],
          "target_indicators": [],
          "filters": [],
          "group_by": "",
        },
        "recommend": {
          "time_range": [
            // 测试用例1: 年季度 + range 操作符（2023-Q1 到 2023-Q4）
            {
              "text": "订单时间",
              "field": "order_time",
              "granularity": "年季度",
              "operator": "range",
              "value": "2023-Q1,2023-Q4",
              "candidate": []
            },
            
            // 测试用例2: 年月日 + in 操作符（多个季度）
            {
              "text": "报表时间",
              "field": "report_time",
              "granularity": "年月日",
              "operator": "in",
              "value": "2023-1-1,2023-1-2,2023-1-3",
              "candidate": []
            },
            
            // 测试用例3: 年月 + range 操作符
            {
              "text": "订单时间",
              "field": "",
              "granularity": "年月",
              "operator": "range",
              "value": "2024-01,2024-03",
              "candidate": []
            },
            
            // 测试用例4: 年月 + in 操作符
            {
              "text": "订单时间",
              "field": "",
              "granularity": "年",
              "operator": "in",
              "value": "2023,2024,2025",
              "candidate": []
            },
          ],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "累计交易金额",
              "field": "",
              "function": "sum",
              "isCalculated": "false",
              "qualifier": [
                {
                  "type": "dim",
                  "text": "水库名称",
                  "field": "SKMC",
                  "operator": "in",
                  "value": "三峡水库"
                }
              ],
              "group_filters": [ // 分组过滤条件，适用于问数
                {
                  "operator": ">",
                  "value": "10"
                },
                {
                  "operator": "<=",
                  "value": "20"
                }
              ]
            },
            {
              "text": "指标名称",
              "field": "",
              "function": "sum",
              "isCalculated": "false",
              "qualifier": [
                {
                  "type": "dim",
                  "text": "水库名称",
                  "field": "SKMC",
                  "operator": "in",
                  "value": "三峡水库"
                }
              ],
              "group_filters": [ // 分组过滤条件，适用于问数
                {
                  "operator": ">",
                  "value": "10"
                },
                {
                  "operator": "<=",
                  "value": "20"
                }
              ]
            }
          ],
        }
      }
    ]
  },

  // 3. 归因分析场景 - 单指标归因
  analysisSingleSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_analysis",
        "query_mode": "analysis_single_indicator",
        "confirm": {
          "time_range": [
            {
              "text": "监测时间",
              "field": "monitor_time"
            }
          ],
          "dimensions": [],
          "target_indicators": [],
          "base_indicators": [],
          "filters": [],
          "indicator_status": ""
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "single",
            "base_indicators": "single"
          },
          "time_range": [],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "未来入库流量",
              "field": "RKLL",
              "function": "AVG",
              "qualifier": [],
              "candidate": [
                {
                  "text": "未来入库流量",
                  "field": "rgajkajcaivnawvljslb.SDJSL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来出库流量",
                  "field": "rgajkajcaivnawvljslb.SDJSL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来水位",
                  "field": "rgajkajcaivnawvljslb.SDJSL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                }
              ]
            }
          ],
          "indicator_status": "偏高",
          "base_indicators": [],
          "filters": [
            {
              "type": "dim",
              "text": "降雨强度",
              "field": "JYQD",
              "operator": ">=",
              "value": "前端输入"
            }
          ]
        }
      }
    ]
  },

  // 4. 预测分析场景
  predictSample:
  //   {
  //     "agent_label": "intent_clarify",
  //     "agent_step": [
  //         {
  //             "query_mode": "predict_time_series",
  //             "chat_mode": "chat_with_predict",
  //             "confirm": {
  //                 "time_range": [{
  //                     "text": "2023年2季度",
  //                     "field": "hdsqb.SJ",
  //                     "granularity": "年季度",
  //                     "operator": "range",
  //                     "value": "2023-04-01,2023-06-30",
  //                     "candidate": []
  //                 }],
  //                 "predict_time_range":[],
  //                 "dimensions": [],
  //                 "target_indicators": [{
  //                     "text": "流量",
  //                     "field": "hdsqb.LL",
  //                     "function": "",
  //                     "candidate": [],
  //                     "qualifier": []
  //                 }],
  //                 "filters": [{
  //                     "type": "dim",
  //                     "text": "永定河",
  //                     "field": "hdsqb.CZDM",
  //                     "operator": "like",
  //                     "value": "%永定河%"
  //                 }],
  //                 "group_by": null
  //             },
  //             "recommend": {
  //                 "time_range": null,
  //                 "predict_time_range":[
  //                     {
  //                         "text": "未来一个季度",
  //                         "granularity": "年季度",
  //                         "operator": "range",
  //                         "value": "2023-07-01,2023-09-30",
  //                         "time_series_continuous": true,
  //                         "periods": 90
  //                     },
  //                     {
  //                         "text": "未来两个月",
  //                         "granularity": "年月",
  //                         "operator": "range",
  //                         "value": "2023-07,2023-08",
  //                         "time_series_continuous": true,
  //                         "periods": 2
  //                     },
  //                     {
  //                         "text": "未来7天",
  //                         "granularity": "年月日",
  //                         "operator": "range",
  //                         "value": "2023-07-01,2023-07-07",
  //                         "time_series_continuous": true,
  //                         "periods": 7
  //                     }
  //                 ],
  //                 "dimensions": null,
  //                 "target_indicators": null
  //             }
  //         }
  //     ]
  // }
  {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_predict",
        "query_mode": "predict_time_series",
        "confirm": {
          "time_range": [{
            "text": "2023年2季度",
            "field": "hdsqb.SJ",
            "granularity": "年季度",
            "operator": "range",
            "value": "2023-04-01,2023-06-30",
            "candidate": []
          }],
          "target_indicators": [],
          "base_indicators": [],
          "filters": [
            {
              "type": "metric",
              "text": "历史流量变异系数",
              "field": "LLBYXS",
              "operator": "<=",
              "value": "前端输入",
              "candidate": [
                {
                  "text": "历史流量变异系数",
                  "field": "LLBYXS"
                },
                {
                  "text": "流量稳定系数",
                  "field": "LLWDXS"
                }
              ]
            }
          ],
          "predict_time_range": [],
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "single",
            "base_indicators": "single"
          },
          "time_range": [],
          "target_indicators": [
            {
              "text": "未来入库流量",
              "field": "RKLL",
              "function": "AVG",
              "qualifier": [],
              "candidate": [
                {
                  "text": "未来入库流量",
                  "field": "RKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来出库流量",
                  "field": "CKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来水位",
                  "field": "SW",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                }
              ]
            }
          ],
          "base_indicators": [
            {
              "text": "未来入库流量",
              "field": "RKLL",
              "function": "AVG",
              "qualifier": [],
              "candidate": [
                {
                  "text": "未来入库流量",
                  "field": "RKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来出库流量",
                  "field": "CKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来水位",
                  "field": "SW",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                }
              ]
            }
          ],
          "filters": [],
          "predict_time_range": [
            {
              "text": "未来一个季度",
              "granularity": "年季度",
              "operator": "range",
              "value": "2023-07-01,2023-09-30",
              "time_series_continuous": true,
              "periods": 90
            },
            {
              "text": "未来两个月",
              "granularity": "年月",
              "operator": "range",
              "value": "2023-07,2023-08",
              "time_series_continuous": true,
              "periods": 2
            },
            {
              "text": "未来7天",
              "granularity": "年月日",
              "operator": "range",
              "value": "2023-07-01,2023-07-07",
              "time_series_continuous": true,
              "periods": 7
            }
          ]
        }
      }
    ]
  }
  ,

  // 5. Excel分析场景
  excelAnalysisSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_excel",
        "query_mode": "excel_description",
        "confirm": {
          "time_range": [],
          "dimensions": [
            {
              "text": "地区",
              "field": "region",
              "candidate": [
                {
                  "text": "地区",
                  "field": "region"
                },
                {
                  "text": "省份",
                  "field": "province"
                }
              ]
            }
          ],
          "target_indicators": [],
          "filters": []
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "multiple",
            "base_indicators": "single"
          },
          "time_range": [],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "GDP总量",
              "field": "gdp_total",
              "function": "SUM"
            },
            {
              "text": "人口数量",
              "field": "population",
              "function": "COUNT"
            }
          ],
          "filters": [
            {
              "type": "dim",
              "text": "数据质量",
              "field": "data_quality",
              "operator": "=",
              "value": "前端输入"
            }
          ]
        }
      }
    ]
  },

  // 6. 大屏场景
  dashboardSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_dashboard",
        "query_mode": "dashboard_aggregation",
        "confirm": {
          "time_range": [],
          "dimensions": [
            {
              "text": "设备类型",
              "field": "device_type",
              "candidate": [
                {
                  "text": "设备类型",
                  "field": "device_type"
                },
                {
                  "text": "监测设备",
                  "field": "monitor_device"
                }
              ]
            }
          ],
          "target_indicators": [],
          "filters": [
            {
              "type": "dim",
              "text": "维护状态",
              "field": "maintain_status",
              "operator": "!=",
              "value": "前端输入",
              "candidate": [
                {
                  "text": "维护状态",
                  "field": "maintain_status"
                },
                {
                  "text": "运行状态",
                  "field": "running_status"
                }
              ]
            }
          ]
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "multiple",
            "base_indicators": "single"
          },
          "time_range": [
            {
              "text": "近7天",
              "field": "monitor_time",
              "operator": "range",
              "value": "last_7_days"
            }
          ],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "在线率",
              "field": "online_rate",
              "function": "AVG"
            },
            {
              "text": "数据完整率",
              "field": "data_integrity",
              "function": "AVG",
              "qualifier": [
                {
                  "type": "metric",
                  "text": "数据量",
                  "field": "data_volume",
                  "operator": ">=",
                  "value": "前端输入",
                  "input_type": "input"
                }
              ]
            }
          ],
          "filters": []
        }
      }
    ]
  },

  // 7. 多维指标归因场景
  analysisMultiSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_analysis",
        "query_mode": "analysis_dims_indicator",
        "confirm": {
          "time_range": [
            {
              "text": "2024年夏季",
              "field": "season_date",
              "operator": "range",
              "value": "2024-06-01,2024-08-31"
            }
          ],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "汛期水位",
              "field": "flood_level",
              "function": "MAX",
              "candidate": [
                {
                  "text": "汛期水位",
                  "field": "flood_level"
                },
                {
                  "text": "最高水位",
                  "field": "max_water_level"
                }
              ]
            }
          ],
          "base_indicators": [],
          "filters": [],
          "indicator_status": "偏高"
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "multiple",
            "base_indicators": "multiple"
          },
          "time_range": [],
          "dimensions": [
            {
              "text": "长江流域",
              "field": "river_basin"
            },
            {
              "text": "上游水库",
              "field": "SYSK"
            }
          ],
          "target_indicators": [],
          "indicator_status": '',
          "base_indicators": [],
          "filters": [
            {
              "type": "dim",
              "text": "防洪等级",
              "field": "flood_control_level",
              "operator": ">=",
              "value": "三级"
            }
          ]
        }
      }
    ]
  },

  // 8. 实体对比指标归因场景
  analysisCompareSample: {
    "agent_label": "intent_clarify",
    "agent_step": [
      {
        "chat_mode": "chat_with_analysis",
        "query_mode": "analysis_compare_indicator",
        "confirm": {
          "time_range": [],
          "dimensions": [],
          "target_indicators": [],
          "base_indicators": [],
          "filters": [
            {
              "type": "dim",
              "text": "数据质量",
              "field": "SJZL",
              "operator": "=",
              "value": "前端输入",
              "candidate": [
                {
                  "text": "数据质量",
                  "field": "SJZL"
                },
                {
                  "text": "采集状态",
                  "field": "CJZT"
                }
              ]
            }
          ],
          "indicator_status": ""
        },
        "recommend": {
          "config": {
            "time_range": "single",
            "dimensions": "multiple",
            "target_indicators": "single",
            "base_indicators": "single"
          },
          "time_range": [
            {
              "text": "时间范围",
              "candidate": [
                {
                  "text": "2024年第一季度",
                  "field": "report_date",
                  "operator": "range",
                  "value": "2024-01-01,2024-03-31"
                },
                {
                  "text": "2024年上半年",
                  "field": "report_date",
                  "operator": "range",
                  "value": "2024-01-01,2024-06-30"
                },
                {
                  "text": "近30天",
                  "field": "report_date",
                  "operator": "range",
                  "value": "last_30_days"
                }
              ]
            }
          ],
          "dimensions": [],
          "target_indicators": [
            {
              "text": "未来入库流量",
              "field": "RKLL",
              "function": "AVG",
              "qualifier": [],
              "candidate": [
                {
                  "text": "未来入库流量",
                  "field": "RKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来出库流量",
                  "field": "CKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来水位",
                  "field": "SW",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                }
              ]
            }
          ],
          "base_indicators": [
            {
              "text": "未来入库流量",
              "field": "RKLL",
              "function": "AVG",
              "qualifier": [],
              "candidate": [
                {
                  "text": "未来入库流量",
                  "field": "RKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来出库流量",
                  "field": "CKLL",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                },
                {
                  "text": "未来水位",
                  "field": "SW",
                  "function": "AVG",
                  "qualifier": [
                    {
                      "type": "dim",
                      "text": "水库名称",
                      "field": "SKMC",
                      "operator": "in",
                      "value": "三峡水库"
                    }
                  ]
                }
              ]
            }
          ],
          "filters": [],
          "indicator_status": "偏高"
        }
      }
    ]
  }
};

// 用于前端组件的字段映射配置
export const fieldMappings = {
  // 操作符映射
  operators: {
    ">": "大于",
    "<": "小于",
    "=": "等于",
    "!=": "不等于",
    ">=": "大于等于",
    "<=": "小于等于",
    "range": "介于",
    "not range": "不介于",
    "like": "是",
    "not like": "不是",
    "in": "包括",
    "not in": "不包括",
    "null": "为空",
    "not null": "不为空"
  },

  // 聚合函数映射
  functions: {
    "MAX": "最大值",
    "MIN": "最小值",
    "AVG": "平均值",
    "SUM": "求和",
    "COUNT": "计数",
    "COUNT_DISTINCT": "去重计数"
  },

  // 场景类型映射
  chatModes: {
    "chat_with_db_execute": "问数",
    "chat_with_analysis": "归因",
    "chat_with_predict": "预测",
    "chat_with_excel": "Excel分析",
    "chat_with_dashboard": "大屏"
  }
};
