export const VIEW_DEMO_DATA = {
  "layoutHtml": {
    "name": "xxx大屏",
    "id":"3VAQALp-Zs",
    "description": "xxx大屏描述",
    "version": "1.0.0",
    "author": "xxx",
    "content": "<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>大屏展示布局</title>\r\n    <style>\r\n        body {\r\n            font-family: \"Microsoft YaHei\", sans-serif;\r\n            margin: 0;\r\n            padding: 0;\r\n            background-color: #0f1c3f;\r\n            color: #fff;\r\n            overflow: hidden;\r\n        }\r\n        \r\n        .dashboard {\r\n            display: flex;\r\n            height: 100vh;\r\n            padding: 20px;\r\n            box-sizing: border-box;\r\n        }\r\n        \r\n        .left-panel, .right-panel {\r\n            width: 250px;\r\n            display: flex;\r\n            flex-direction: column;\r\n            gap: 20px;\r\n        }\r\n        \r\n        .main-panel {\r\n            flex: 1;\r\n            margin: 0 20px;\r\n            background-color: rgba(16, 42, 90, 0.7);\r\n            border-radius: 10px;\r\n            box-shadow: 0 0 30px rgba(0, 150, 255, 0.3);\r\n            display: flex;\r\n            justify-content: center;\r\n            align-items: center;\r\n            font-size: 24px;\r\n            position: relative;\r\n            overflow: hidden;\r\n        }\r\n        \r\n        .main-panel::before {\r\n            content: \"\";\r\n            position: absolute;\r\n            top: 0;\r\n            left: 0;\r\n            right: 0;\r\n            bottom: 0;\r\n            border: 2px solid rgba(0, 150, 255, 0.5);\r\n            border-radius: 8px;\r\n            pointer-events: none;\r\n        }\r\n        \r\n        .panel-title {\r\n            position: absolute;\r\n            top: 15px;\r\n            left: 20px;\r\n            font-size: 18px;\r\n            color: #4fc3f7;\r\n        }\r\n        \r\n        .box {\r\n            height: calc((100vh - 100px) / 3);\r\n            border-radius: 8px;\r\n            display: flex;\r\n            justify-content: center;\r\n            align-items: center;\r\n            font-size: 18px;\r\n            font-weight: bold;\r\n            text-align: center;\r\n            position: relative;\r\n            overflow: hidden;\r\n            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);\r\n            transition: all 0.3s ease;\r\n            background: linear-gradient(135deg, rgba(16, 42, 90, 0.8) 0%, rgba(36, 78, 156, 0.8) 100%);\r\n            border: 1px solid rgba(0, 150, 255, 0.3);\r\n        }\r\n        \r\n        .box:hover {\r\n            transform: translateY(-5px);\r\n            box-shadow: 0 8px 25px rgba(0, 150, 255, 0.4);\r\n            border-color: rgba(0, 150, 255, 0.6);\r\n        }\r\n        \r\n        .box::before {\r\n            content: \"\";\r\n            position: absolute;\r\n            top: 0;\r\n            left: 0;\r\n            width: 100%;\r\n            height: 100%;\r\n            background: linear-gradient(90deg, transparent, rgba(0, 150, 255, 0.1), transparent);\r\n            transform: translateX(-100%);\r\n        }\r\n        \r\n        .box:hover::before {\r\n            animation: shine 1.5s infinite;\r\n        }\r\n        \r\n        @keyframes shine {\r\n            100% {\r\n                transform: translateX(100%);\r\n            }\r\n        }\r\n        \r\n        .box-title {\r\n            position: absolute;\r\n            top: 10px;\r\n            left: 15px;\r\n            font-size: 14px;\r\n            color: #4fc3f7;\r\n        }\r\n        \r\n        /* 为每个框设置不同的装饰颜色 */\r\n        .box-1 { border-top: 3px solid #4fc3f7; }\r\n        .box-2 { border-top: 3px solid #00e676; }\r\n        .box-3 { border-top: 3px solid #ff4081; }\r\n        .box-4 { border-top: 3px solid #ff9100; }\r\n        .box-5 { border-top: 3px solid #9c27b0; }\r\n        .box-6 { border-top: 3px solid #00bcd4; }\r\n        \r\n        .main-content {\r\n            font-size: 36px;\r\n            color: rgba(255, 255, 255, 0.8);\r\n            text-shadow: 0 0 10px rgba(0, 150, 255, 0.7);\r\n        }\r\n    </style>\r\n</head>\r\n<body>\r\n    <div class=\"dashboard\">\r\n        <!-- 左侧三个框 -->\r\n        <div class=\"left-panel\">\r\n            <div class=\"box box-1\">\r\n                <div class=\"box-title\">设备分布图</div>\r\n                <div>设备状态监控</div>\r\n            </div>\r\n            <div class=\"box box-2\">\r\n                <div class=\"box-title\">实时监控数据</div>\r\n                <div>数据采集分析</div>\r\n            </div>\r\n            <div class=\"box box-3\">\r\n                <div class=\"box-title\">报警信息统计</div>\r\n                <div>异常事件处理</div>\r\n            </div>\r\n        </div>\r\n        \r\n        <!-- 中间主显示区 -->\r\n        <div class=\"main-panel\">\r\n            <div class=\"panel-title\">数据中心大屏</div>\r\n            <div class=\"main-content\">智慧管理平台</div>\r\n        </div>\r\n        \r\n        <!-- 右侧三个框 -->\r\n        <div class=\"right-panel\">\r\n            <div class=\"box box-4\">\r\n                <div class=\"box-title\">能耗分析</div>\r\n                <div>能源消耗统计</div>\r\n            </div>\r\n            <div class=\"box box-5\">\r\n                <div class=\"box-title\">维护记录</div>\r\n                <div>设备维护历史</div>\r\n            </div>\r\n            <div class=\"box box-6\">\r\n                <div class=\"box-title\">系统状态</div>\r\n                <div>运行健康度</div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</body>\r\n</html>"
  },
  "chartDescriptionList": [
    { "chartName": "水利分布图", "chartId": "JGuOJzl8Y" },
    { "chartName": "设备分布图", "chartId": "xxxxxx" },
    { "chartName": "实时监控数据", "chartId": "xxxxxx" },
    { "chartName": "报警信息统计", "chartId": "xxxxxx" }
  ],
  "project": {
    "engine": "unity",
    "layaEditorUrl": "",
    "pages": [
      {
        "id": "3VAQALp-Zs",
        "name": "default 2D",
        "type": "pc",
        "isDefault": false,
        "style": {
          "background": "#FFFFFF",
          "customHeight": 0,
          "customWidth": 0,
          "resolution": "1440*900"
        },
        "viewPattern": "fullScreen",
        "vRefLines": [],
        "hRefLines": [],
        "elements": [
          {
            "id": "JGuOJzl8Y",
            "visible": true,
            "com": {
              "componentId": "t1",
              "version": "1.0.1",
              "name": "t1"
            },
            "attr": {
              "rotate": 0,
              "left": 248,
              "top": 288,
              "zIndex": 1,
              "width": 380,
              "height": 210,
              "minWidth": 0,
              "minHeight": 0
            },
            "layerInfo": {
              "x": null,
              "y": null
            },
            "type": "element",
            "group": null,
            "view": {
              "global": {
                "axisName": "x",
                "markLine": []
              },
              "grid": {
                "top": 45,
                "right": 20,
                "bottom": 20,
                "left": 30
              },
              "title": {
                "show": false,
                "text": "平滑折线图",
                "left": 30,
                "top": 0,
                "textStyle": {
                  "fontSize": 16,
                  "color": "#333",
                  "fontFamily": "Microsoft Yahei",
                  "fontWeight": "bolder"
                }
              },
              "tooltip": {
                "show": true,
                "trigger": "axis",
                "formatter": "",
                "backgroundColor": "rgba(50,50,50,0.7)",
                "borderColor": "#fff",
                "borderWidth": 0,
                "padding": "5,5,5,5"
              },
              "legend": {
                "show": true,
                "left": 150,
                "top": 0,
                "orient": "horizontal",
                "icon": "circle",
                "textStyle": {
                  "fontSize": 12,
                  "color": "#333",
                  "fontFamily": "Microsoft Yahei",
                  "fontWeight": "normal"
                }
              },
              "xAxis": {
                "show": true,
                "boundaryGap": false,
                "name": {
                  "name": "",
                  "nameLocation": "end",
                  "nameGap": 20,
                  "nameTextStyle": {
                    "color": "#333",
                    "fontSize": 12,
                    "fontWeight": "normal",
                    "fontFamily": "sans-serif"
                  }
                },
                "axisLine": {
                  "show": true,
                  "lineStyle": {
                    "color": "#333",
                    "type": "solid",
                    "width": 1
                  }
                },
                "axisLabel": {
                  "show": true,
                  "fontSize": 12,
                  "color": "#333",
                  "fontFamily": "Microsoft Yahei",
                  "fontWeight": "normal"
                },
                "axisTick": {
                  "show": true,
                  "inside": false,
                  "alignWithLabel": true
                },
                "splitLine": {
                  "show": false,
                  "lineStyle": {
                    "color": "#999",
                    "type": "dotted",
                    "width": 1
                  }
                }
              },
              "yAxis": {
                "show": true,
                "maxValue": "",
                "minValue": "",
                "name": {
                  "name": "",
                  "nameLocation": "end",
                  "nameGap": 20,
                  "nameTextStyle": {
                    "color": "#333",
                    "fontSize": 12,
                    "fontWeight": "normal",
                    "fontFamily": "sans-serif"
                  }
                },
                "axisLine": {
                  "show": true,
                  "lineStyle": {
                    "color": "#333",
                    "type": "solid",
                    "width": 1
                  }
                },
                "axisLabel": {
                  "show": true,
                  "fontSize": 12,
                  "color": "#333",
                  "fontFamily": "Microsoft Yahei",
                  "fontWeight": "normal"
                },
                "axisTick": {
                  "show": true,
                  "inside": false
                },
                "splitLine": {
                  "show": false,
                  "lineStyle": {
                    "color": "#999",
                    "type": "dotted",
                    "width": 1
                  }
                }
              },
              "defaultDataZoom": {
                "open": false,
                "type": "inside",
                "slider": {
                  "show": true,
                  "height": 16,
                  "bottom": 0,
                  "start": 30,
                  "end": 70,
                  "backgroundColor": "rgba(255,255,255,0)",
                  "borderColor": "#999",
                  "fillerColor": "#b53332"
                }
              },
              "series": [
                {
                  "columnName": "y1",
                  "name": "2018",
                  "type": "line",
                  "symbol": "circle",
                  "label": {
                    "show": false,
                    "fontSize": 12,
                    "color": "auto",
                    "fontFamily": "Microsoft Yahei",
                    "fontWeight": "normal"
                  },
                  "itemStyle": {
                    "direction": "0,0,0,1",
                    "startColor": "#57a2ff",
                    "endColor": "#fff"
                  },
                  "lineStyle": {
                    "width": 2,
                    "type": "solid"
                  },
                  "smooth": true
                },
                {
                  "columnName": "y2",
                  "name": "2019",
                  "type": "line",
                  "symbol": "circle",
                  "label": {
                    "show": false,
                    "fontSize": 12,
                    "color": "auto",
                    "fontFamily": "Microsoft Yahei",
                    "fontWeight": "normal"
                  },
                  "itemStyle": {
                    "direction": "0,0,0,1",
                    "startColor": "#57a2ff",
                    "endColor": "#fff"
                  },
                  "lineStyle": {
                    "width": 2,
                    "type": "solid"
                  },
                  "smooth": true
                },
                {
                  "columnName": "y3",
                  "name": "2020",
                  "type": "line",
                  "symbol": "circle",
                  "label": {
                    "show": false,
                    "fontSize": 12,
                    "color": "auto",
                    "fontFamily": "Microsoft Yahei",
                    "fontWeight": "normal"
                  },
                  "itemStyle": {
                    "direction": "0,0,0,1",
                    "startColor": "#57a2ff",
                    "endColor": "#fff"
                  },
                  "lineStyle": {
                    "width": 2,
                    "type": "solid"
                  },
                  "smooth": true
                }
              ]
            },
            "data": {
              "type": "2d",
              "dataSource": null,
              "ownDataFilter": {
                "id": "private",
                "value": "private",
                "label": "私有过滤器",
                "code": "return [{\n    x: \"类目1\",\n    y1: 90,\n    y2: 70,\n    y3: 50\n},{\n    x: \"类目2\",\n    y1: 50,\n    y2: 30,\n    y3: 10\n},{\n    x: \"类目3\",\n    y1: 90,\n    y2: 70,\n    y3: 50\n},{\n    x: \"类目4\",\n    y1: 50,\n    y2: 30,\n    y3: 10\n}]",
                "using": true,
                "name": "私有过滤器",
                "validated": true
              },
              "useFilter": true,
              "dataFilterArr": [
                {
                  "id": "private",
                  "using": true
                }
              ],
              "dcFields": {
                "x": [],
                "y": []
              }
            },
            "variables": [],
            "children": [],
            "dataType": "dataSource",
            "dataModel": {
              "id": "",
              "uid": "194",
              "config": {
                "needAutoRefresh": true,
                "autoRefreshInterval": 900,
                "dataCounts": 100,
                "dataModel": {
                  "x": [],
                  "y": []
                }
              }
            }
          }
        ],
        "groups": [],
        "uiConfigs": [],
        "modelInfo": ""
      }
    ],
    "dataSource": [],
    "dataFilter": [],
    "needPass": true,
    "thumbnail": "",
    "state": "0",
    "templateType": 10,
    "variables": [],
    "clear": false,
    "isAdmin": "",
    "copyFrom": [],
    "_id": "6731d8692a401367fc6d37db",
    "copyForm": [],
    "name": "test-i18n",
    "user": "5d1c4359946e6e14dc717d43",
    "desc": "just a OneView project",
    "isPublic": "private",
    "project_type": "2D",
    "shareCode": "1234",
    "isTemplate": false,
    "createdAt": "2024-11-11T10:11:53.421Z",
    "lastEditAt": "2025-03-26T02:51:45.854Z",
    "__v": 0,
    "accessesCount": 1
  }
}
