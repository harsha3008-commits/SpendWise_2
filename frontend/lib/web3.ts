import Web3 from 'web3';
import { Platform } from 'react-native';

// Polygon Network Configuration
const POLYGON_MAINNET = {
  chainId: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://polygon-rpc.com/'],
  blockExplorerUrls: ['https://polygonscan.com/'],
};

const POLYGON_MUMBAI = {
  chainId: '0x13881',
  chainName: 'Polygon Mumbai Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
  blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
};

interface WalletConnection {
  address: string;
  provider: 'metamask' | 'walletconnect' | 'injected';
  chainId: number;
  balance?: string;
}

class SpendWiseWeb3 {
  private web3: Web3 | null = null;
  private account: string | null = null;
  private provider: any = null;

  constructor() {
    this.initializeWeb3();
  }

  private async initializeWeb3() {
    // For web platform, try to detect injected wallet
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Check for MetaMask
      if ((window as any).ethereum) {
        this.web3 = new Web3((window as any).ethereum);
        this.provider = (window as any).ethereum;
      }
    }
  }

  // Connect to wallet (MetaMask for web, WalletConnect for mobile)
  async connectWallet(): Promise<WalletConnection | null> {
    try {
      if (!this.web3 || !this.provider) {
        throw new Error('No Web3 provider available');
      }

      // Request account access
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        this.account = accounts[0];
        
        // Get current chain ID
        const chainId = await this.web3.eth.getChainId();
        
        // Get balance
        const balance = await this.web3.eth.getBalance(this.account);
        const balanceInEther = this.web3.utils.fromWei(balance, 'ether');

        return {
          address: this.account,
          provider: 'metamask',
          chainId: Number(chainId),
          balance: balanceInEther,
        };
      }

      throw new Error('No accounts found');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  // Switch to Polygon network
  async switchToPolygon(testnet: boolean = false): Promise<boolean> {
    if (!this.provider) {
      throw new Error('No wallet provider available');
    }

    const network = testnet ? POLYGON_MUMBAI : POLYGON_MAINNET;

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Polygon network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Polygon network:', switchError);
        throw switchError;
      }
    }
  }

  // Create a transaction hash anchor on Polygon
  async anchorTransactionHash(merkleRoot: string): Promise<string> {
    if (!this.web3 || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simple transaction to store data on blockchain
      // In production, you would deploy a smart contract for this
      const transaction = {
        from: this.account,
        to: this.account, // Send to self
        value: '0',
        data: this.web3.utils.asciiToHex(merkleRoot),
        gas: 21000,
      };

      const txHash = await this.web3.eth.sendTransaction(transaction);
      return typeof txHash === 'string' ? txHash : txHash.transactionHash;
    } catch (error) {
      console.error('Error anchoring transaction hash:', error);
      throw error;
    }
  }

  // Get current wallet balance
  async getBalance(address?: string): Promise<string> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    const accountAddress = address || this.account;
    if (!accountAddress) {
      throw new Error('No account address available');
    }

    const balance = await this.web3.eth.getBalance(accountAddress);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  // Get transaction details
  async getTransaction(txHash: string): Promise<any> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    return await this.web3.eth.getTransaction(txHash);
  }

  // Disconnect wallet
  disconnect(): void {
    this.account = null;
    this.web3 = null;
    this.provider = null;
  }

  // Get current account
  getCurrentAccount(): string | null {
    return this.account;
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.account !== null;
  }

  // Get network info
  async getNetworkInfo(): Promise<{ chainId: number; networkName: string } | null> {
    if (!this.web3) {
      return null;
    }

    const chainId = await this.web3.eth.getChainId();
    let networkName = 'Unknown Network';

    switch (Number(chainId)) {
      case 1:
        networkName = 'Ethereum Mainnet';
        break;
      case 137:
        networkName = 'Polygon Mainnet';
        break;
      case 80001:
        networkName = 'Polygon Mumbai Testnet';
        break;
      case 5:
        networkName = 'Ethereum Goerli Testnet';
        break;
    }

    return {
      chainId: Number(chainId),
      networkName,
    };
  }

  // Listen for account changes
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.provider && this.provider.on) {
      this.provider.on('accountsChanged', callback);
    }
  }

  // Listen for network changes
  onChainChanged(callback: (chainId: string) => void): void {
    if (this.provider && this.provider.on) {
      this.provider.on('chainChanged', callback);
    }
  }

  // Remove event listeners
  removeAllListeners(): void {
    if (this.provider && this.provider.removeAllListeners) {
      this.provider.removeAllListeners();
    }
  }
}

// Singleton instance
let web3Instance: SpendWiseWeb3 | null = null;

export const getWeb3Instance = (): SpendWiseWeb3 => {
  if (!web3Instance) {
    web3Instance = new SpendWiseWeb3();
  }
  return web3Instance;
};

export default SpendWiseWeb3;
export type { WalletConnection };