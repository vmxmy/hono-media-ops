#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'nodes');
const outputFile = path.join(__dirname, 'spec驱动写文章-v2.json');

// 读取所有节点文件
const nodeFiles = fs.readdirSync(nodesDir).filter(f => f.endsWith('.json')).sort();

const nodes = [];
for (const file of nodeFiles) {
  const filePath = path.join(nodesDir, file);
  const nodeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  nodes.push(nodeData);
  console.log(`✓ Loaded: ${file}`);
}

// 定义连接关系
const connections = {
  "webhook_receive": {
    "main": [[
      { "node": "load_spec", "type": "main", "index": 0 }
    ]]
  },
  "load_spec": {
    "main": [[
      { "node": "validate_spec", "type": "main", "index": 0 }
    ]]
  },
  "validate_spec": {
    "main": [[
      { "node": "check_search_needed", "type": "main", "index": 0 }
    ]]
  },
  "check_search_needed": {
    "main": [
      [{ "node": "search_material", "type": "main", "index": 0 }],
      [{ "node": "no_search_material", "type": "main", "index": 0 }]
    ]
  },
  "search_material": {
    "main": [[
      { "node": "inject_search_material", "type": "main", "index": 0 }
    ]]
  },
  "inject_search_material": {
    "main": [[
      { "node": "merge_search_branches", "type": "main", "index": 0 }
    ]]
  },
  "no_search_material": {
    "main": [[
      { "node": "merge_search_branches", "type": "main", "index": 1 }
    ]]
  },
  "merge_search_branches": {
    "main": [[
      { "node": "split_into_batches", "type": "main", "index": 0 }
    ]]
  },
  "split_into_batches": {
    "main": [[
      { "node": "prepare_section_contexts", "type": "main", "index": 0 }
    ]]
  },
  "prepare_section_contexts": {
    "main": [[
      { "node": "llm_generate_section", "type": "main", "index": 0 }
    ]]
  },
  "llm_generate_section": {
    "main": [[
      { "node": "validate_section_output", "type": "main", "index": 0 }
    ]]
  },
  "validate_section_output": {
    "main": [[
      { "node": "aggregate_all_sections", "type": "main", "index": 0 }
    ]]
  },
  "aggregate_all_sections": {
    "main": [[
      { "node": "stitch_and_prepare", "type": "main", "index": 0 },
      { "node": "markdown_formatting_spec", "type": "main", "index": 0 }
    ]]
  },
  "stitch_and_prepare": {
    "main": [[
      { "node": "merge_markdown_spec", "type": "main", "index": 0 }
    ]]
  },
  "markdown_formatting_spec": {
    "main": [[
      { "node": "merge_markdown_spec", "type": "main", "index": 1 }
    ]]
  },
  "merge_markdown_spec": {
    "main": [[
      { "node": "llm_final_polish", "type": "main", "index": 0 }
    ]]
  },
  "llm_final_polish": {
    "main": [[
      { "node": "insert_execution_record", "type": "main", "index": 0 },
      { "node": "update_task_status", "type": "main", "index": 0 }
    ]]
  },
  "gemini_flash_model": {
    "ai_languageModel": [[
      { "node": "llm_generate_section", "type": "ai_languageModel", "index": 0 },
      { "node": "llm_final_polish", "type": "ai_languageModel", "index": 0 }
    ]]
  }
};

// 构建最终工作流
const workflow = {
  "nodes": nodes,
  "connections": connections,
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "b567d3c8d87fb7f8b70a1dd36ea2ab492a07686b7429a62e28beb58f3b19cc21"
  }
};

// 写入文件
fs.writeFileSync(outputFile, JSON.stringify(workflow, null, 2));

console.log(`\n✅ Workflow created: ${outputFile}`);
console.log(`📊 Total nodes: ${nodes.length}`);
console.log(`🔗 Total connections: ${Object.keys(connections).length}`);
