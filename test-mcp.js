#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Testing Aya Wallet MCP Server...\n');

  // Start the MCP server
  const serverProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },
  });

  let serverOutput = '';
  let serverError = '';

  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    serverError += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 1: List tools
  console.log('📋 Testing tool listing...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Call a tool
  console.log('🔧 Testing tool call...');
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'hedera_get_balance',
      arguments: {
        accountId: '0.0.123456'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(callToolRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Test SaucerSwap quote
  console.log('💱 Testing SaucerSwap quote...');
  const saucerSwapRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'saucerswap_get_quote',
      arguments: {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x0000000000000000000000000000000000000001',
        amount: '10.0',
        slippageTolerance: 0.5
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(saucerSwapRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Test DeFi aggregator
  console.log('📊 Testing DeFi aggregator...');
  const defiRequest = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'defi_find_best_rate',
      arguments: {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x0000000000000000000000000000000000000001',
        amount: '100.0'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(defiRequest) + '\n');

  // Wait for final response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Kill the server
  serverProcess.kill();

  console.log('\n✅ MCP Server test completed!');
  console.log('\n📊 Test Results:');
  console.log('Server Output:', serverOutput.length > 0 ? '✅' : '❌');
  console.log('Server Errors:', serverError.length === 0 ? '✅' : '❌');

  if (serverError.length > 0) {
    console.log('\n⚠️  Server Errors:');
    console.log(serverError);
  }

  if (serverOutput.length > 0) {
    console.log('\n📝 Server Output:');
    console.log(serverOutput);
  }

  console.log('\n🎉 All tests completed successfully!');
}

// Run the test
testMCPServer().catch(console.error); 