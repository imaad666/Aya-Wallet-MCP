#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🧪 Interactive MCP Server Test');
console.log('==============================');

// Start the MCP server
const mcpServer = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;

// Function to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: requestId++,
    method,
    params
  };
  
  console.log(`\n📤 Sending: ${method}`);
  console.log('Request:', JSON.stringify(request, null, 2));
  
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
}

// Handle server responses
mcpServer.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('\n📥 Response:');
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw output:', line);
    }
  });
});

// Handle server errors
mcpServer.stderr.on('data', (data) => {
  console.log('❌ Server Error:', data.toString());
});

// Test sequence
setTimeout(() => {
  console.log('\n🔧 Testing tool listing...');
  sendRequest('tools/list');
}, 1000);

setTimeout(() => {
  console.log('\n💱 Testing SaucerSwap quote...');
  sendRequest('tools/call', {
    name: 'saucerswap_get_quote',
    arguments: {
      tokenIn: '0x0000000000000000000000000000000000000000', // HBAR
      tokenOut: '0x0000000000000000000000000000000000000001', // USDC
      amount: '10.0',
      slippageTolerance: 0.5
    }
  });
}, 3000);

setTimeout(() => {
  console.log('\n💰 Testing Hedera balance...');
  sendRequest('tools/call', {
    name: 'hedera_get_balance',
    arguments: {
      accountId: '0.0.123456'
    }
  });
}, 5000);

setTimeout(() => {
  console.log('\n🎯 Testing DeFi aggregator...');
  sendRequest('tools/call', {
    name: 'defi_find_best_rate',
    arguments: {
      tokenIn: '0x0000000000000000000000000000000000000000', // HBAR
      tokenOut: '0x0000000000000000000000000000000000000001', // USDC
      amount: '10.0'
    }
  });
}, 7000);

setTimeout(() => {
  console.log('\n✅ Test completed!');
  mcpServer.kill();
  process.exit(0);
}, 9000);

console.log('🚀 MCP Server test started. Waiting for responses...'); 