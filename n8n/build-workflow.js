const fs = require('fs');
const path = require('path');

// 读取所有节点文件
const nodeFiles = [
  '01-webhook.json',
  '02-load-spec.json',
  '03-validate-spec.json',
  '04-check-search.json',
  '05-search-material.json',
  '06-inject-search.json',
  '07-no-search.json',
  '09-split-batches.json',
  '10-llm-generate-batch.json'
];

const workflow = {
  name: "Spec驱动写文章-批量生成版",
  nodes: [],
  connections: {},
  pinData: {},
  settings: {
    executionOrder: "v1"
  },
  staticData: null,
  tags: [],
  triggerCount: 0,
  updatedAt: new Date().toISOString(),
  versionId: "1"
};

// 读取所有节点
nodeFiles.forEach(file => {
  const filePath = path.join(__dirname, 'nodes', file);
  const nodeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (nodeData.nodes && nodeData.nodes.length > 0) {
    workflow.nodes.push(...nodeData.nodes);
  }
});

// 定义节点连接关系
const connections = {
  "webhook_receive": {
    "main": [[{ "node": "load_spec", "type": "main", "index": 0 }]]
  },
  "load_spec": {
    "main": [[{ "node": "validate_spec", "type": "main", "index": 0 }]]
  },
  "validate_spec": {
    "main": [[{ "node": "check_search_needed", "type": "main", "index": 0 }]]
  },
  "check_search_needed": {
    "main": [
      [{ "node": "search_material", "type": "main", "index": 0 }],
      [{ "node": "no_search_material", "type": "main", "index": 0 }]
    ]
  },
  "search_material": {
    "main": [[{ "node": "inject_search_material", "type": "main", "index": 0 }]]
  },
  "inject_search_material": {
    "main": [[{ "node": "split_into_batches", "type": "main", "index": 0 }]]
  },
  "no_search_material": {
    "main": [[{ "node": "split_into_batches", "type": "main", "index": 0 }]]
  },
  "split_into_batches": {
    "main": [[{ "node": "llm_generate_batch", "type": "main", "index": 0 }]]
  },
  "llm_generate_batch": {
    "main": [[]]
  }
};

workflow.connections = connections;

// 写入完整workflow
fs.writeFileSync(
  path.join(__dirname, '完整workflow-批量生成.json'),
  JSON.stringify(workflow, null, 2),
  'utf-8'
);

console.log('✅ Workflow创建成功!');
console.log(`📊 包含 ${workflow.nodes.length} 个节点`);
console.log('📁 文件: 完整workflow-批量生成.json');
