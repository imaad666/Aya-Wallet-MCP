import { HederaDeFiTools } from '../tools/hedera-defi-tools.js';

// Mock the Hedera SDK
jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forName: jest.fn().mockReturnValue({
      setOperator: jest.fn(),
    }),
  },
  AccountId: {
    fromString: jest.fn().mockReturnValue('mocked-account-id'),
  },
  PrivateKey: {
    fromString: jest.fn().mockReturnValue('mocked-private-key'),
  },
  AccountBalanceQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      hbars: {
        toString: jest.fn().mockReturnValue('100.0'),
        toTinybars: jest.fn().mockReturnValue({
          toString: jest.fn().mockReturnValue('10000000000'),
        }),
      },
      tokens: {
        '0.0.123456': { toString: jest.fn().mockReturnValue('1000') },
        '0.0.789012': { toString: jest.fn().mockReturnValue('500') },
      },
    }),
  })),
  TransferTransaction: jest.fn().mockImplementation(() => ({
    addHbarTransfer: jest.fn().mockReturnThis(),
    setTransactionMemo: jest.fn().mockReturnThis(),
    setMaxTransactionFee: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      transactionId: { toString: jest.fn().mockReturnValue('0.0.123456@1705312200.123456789') },
    }),
    getTransactionFeeAsync: jest.fn().mockResolvedValue({
      toString: jest.fn().mockReturnValue('0.0001'),
      toTinybars: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('10000'),
      }),
    }),
  })),
  TransactionReceiptQuery: jest.fn().mockImplementation(() => ({
    setTransactionId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      transactionFee: { toString: jest.fn().mockReturnValue('0.0001') },
    }),
  })),
  Hbar: jest.fn().mockImplementation((value) => ({
    toString: jest.fn().mockReturnValue(value.toString()),
    toTinybars: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue((parseFloat(value) * 100000000).toString()),
    }),
    negated: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue((-parseFloat(value)).toString()),
    }),
  })),
  Status: {
    Success: 'SUCCESS',
  },
}));

describe('HederaDeFiTools', () => {
  let hederaTools: HederaDeFiTools;

  beforeEach(() => {
    hederaTools = new HederaDeFiTools();
  });

  describe('getBalance', () => {
    it('should get account balance successfully', async () => {
      const result = await hederaTools.getBalance('0.0.123456');

      expect(result).toEqual({
        accountId: '0.0.123456',
        balance: '100.0',
        balanceInTinybars: '10000000000',
        tokens: 2,
        timestamp: expect.any(String),
      });
    });

    it('should handle invalid account ID', async () => {
      const mockAccountId = {
        fromString: jest.fn().mockImplementation(() => {
          throw new Error('Invalid account ID');
        }),
      };

      jest.doMock('@hashgraph/sdk', () => ({
        ...jest.requireActual('@hashgraph/sdk'),
        AccountId: mockAccountId,
      }));

      await expect(hederaTools.getBalance('invalid-id')).rejects.toThrow(
        'Failed to get balance for account invalid-id'
      );
    });
  });

  describe('transferHBAR', () => {
    it('should transfer HBAR successfully', async () => {
      const result = await hederaTools.transferHBAR(
        '0.0.123456',
        '0.0.789012',
        '10.0',
        'Test transfer'
      );

      expect(result).toEqual({
        transactionId: '0.0.123456@1705312200.123456789',
        status: 'SUCCESS',
        fromAccountId: '0.0.123456',
        toAccountId: '0.0.789012',
        amount: '10.0',
        memo: 'Test transfer',
        timestamp: expect.any(String),
        networkFee: '0.0001',
      });
    });

    it('should handle transfer failure', async () => {
      const mockReceiptQuery = {
        setTransactionId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          status: 'INSUFFICIENT_BALANCE',
        }),
      };

      jest.doMock('@hashgraph/sdk', () => ({
        ...jest.requireActual('@hashgraph/sdk'),
        TransactionReceiptQuery: jest.fn().mockImplementation(() => mockReceiptQuery),
      }));

      await expect(
        hederaTools.transferHBAR('0.0.123456', '0.0.789012', '10.0')
      ).rejects.toThrow('Transaction failed with status: INSUFFICIENT_BALANCE');
    });
  });

  describe('getAccountInfo', () => {
    it('should get account info successfully', async () => {
      const result = await hederaTools.getAccountInfo('0.0.123456');

      expect(result).toEqual({
        accountId: '0.0.123456',
        balance: '100.0',
        balanceInTinybars: '10000000000',
        tokens: [
          {
            tokenId: '0.0.123456',
            balance: '1000',
            decimals: undefined,
          },
          {
            tokenId: '0.0.789012',
            balance: '500',
            decimals: undefined,
          },
        ],
        timestamp: expect.any(String),
      });
    });
  });

  describe('estimateTransferFee', () => {
    it('should estimate transfer fee successfully', async () => {
      const result = await hederaTools.estimateTransferFee(
        '0.0.123456',
        '0.0.789012',
        '10.0'
      );

      expect(result).toEqual({
        estimatedFee: '0.0001',
        estimatedFeeInHbar: '10000',
        fromAccountId: '0.0.123456',
        toAccountId: '0.0.789012',
        amount: '10.0',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getNetworkInfo', () => {
    it('should get network info successfully', async () => {
      const result = await hederaTools.getNetworkInfo();

      expect(result).toEqual({
        network: 'testnet',
        operatorId: '0.0.123456',
        endpoints: ['https://testnet.mirrornode.hedera.com:443'],
        timestamp: expect.any(String),
      });
    });
  });
}); 