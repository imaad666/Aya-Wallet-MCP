#!/usr/bin/env node

// Set up environment variables for testing
process.env.HEDERA_NETWORK = 'testnet';
process.env.HEDERA_OPERATOR_ID = '0.0.123456';
process.env.HEDERA_OPERATOR_KEY = 'test_key';
process.env.OPENAI_API_KEY = 'test_key';
process.env.OPENAI_API_URL = 'https://api.comput3.ai/v1';
process.env.SAUCERSWAP_API_URL = 'https://api.saucerswap.finance';
process.env.SAUCERSWAP_ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000';
process.env.JWT_SECRET = 'test_jwt_secret_32_characters_long';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters_long';
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';

import { spawn } from 'child_process';

console.log('🧪 Simple MCP Server Test');
console.log('=========================');

// Start the MCP server
const mcpServer = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
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
      if (line.trim()) {
        console.log('Raw output:', line);
      }
    }
  });
});

// Handle server errors
mcpServer.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('Configuration not loaded')) {
    console.log('⚠️  Config loading issue (expected in test mode)');
  } else {
    console.log('❌ Server Error:', error);
  }
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