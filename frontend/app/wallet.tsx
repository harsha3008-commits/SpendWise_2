import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWeb3Instance, WalletConnection } from '../lib/web3';

export default function WalletScreen() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletConnection, setWalletConnection] = useState<WalletConnection | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: number; networkName: string } | null>(null);

  const web3Instance = getWeb3Instance();

  useEffect(() => {
    checkExistingConnection();
    setupEventListeners();

    return () => {
      web3Instance.removeAllListeners();
    };
  }, []);

  const checkExistingConnection = async () => {
    if (web3Instance.isConnected()) {
      const account = web3Instance.getCurrentAccount();
      if (account) {
        try {
          const balance = await web3Instance.getBalance();
          const network = await web3Instance.getNetworkInfo();
          
          setWalletConnection({
            address: account,
            provider: 'metamask',
            chainId: network?.chainId || 0,
            balance: balance,
          });
          setNetworkInfo(network);
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    }
  };

  const setupEventListeners = () => {
    web3Instance.onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWalletConnection(null);
        setNetworkInfo(null);
      } else {
        checkExistingConnection();
      }
    });

    web3Instance.onChainChanged((chainId) => {
      checkExistingConnection();
    });
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const connection = await web3Instance.connectWallet();
      if (connection) {
        setWalletConnection(connection);
        const network = await web3Instance.getNetworkInfo();
        setNetworkInfo(network);
        
        Alert.alert(
          'Wallet Connected!',
          `Successfully connected to ${connection.address.substring(0, 6)}...${connection.address.substring(38)}`,
        );
      }
    } catch (error: any) {
      Alert.alert('Connection Failed', error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToPolygon = async () => {
    try {
      await web3Instance.switchToPolygon(true); // Use testnet for development
      Alert.alert('Success', 'Switched to Polygon network');
      checkExistingConnection();
    } catch (error: any) {
      Alert.alert('Network Switch Failed', error.message || 'Failed to switch network');
    }
  };

  const anchorTransaction = async () => {
    if (!walletConnection) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    try {
      // Generate a sample merkle root (in real app, this would be from transactions)
      const sampleMerkleRoot = 'sample_merkle_root_' + Date.now();
      
      Alert.alert(
        'Anchor Transaction',
        'This will create a transaction on Polygon to anchor your transaction data. A small gas fee will be required.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Proceed', 
            onPress: async () => {
              try {
                const txHash = await web3Instance.anchorTransactionHash(sampleMerkleRoot);
                Alert.alert(
                  'Transaction Anchored!',
                  `Your transaction data has been anchored on the blockchain.\n\nTx Hash: ${txHash.substring(0, 10)}...`,
                );
              } catch (error: any) {
                Alert.alert('Anchoring Failed', error.message || 'Failed to anchor transaction');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const disconnectWallet = () => {
    web3Instance.disconnect();
    setWalletConnection(null);
    setNetworkInfo(null);
    Alert.alert('Disconnected', 'Wallet has been disconnected');
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet Integration</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {!walletConnection ? (
          <View style={styles.connectSection}>
            <View style={styles.connectCard}>
              <Ionicons name="wallet-outline" size={64} color="#007AFF" />
              <Text style={styles.connectTitle}>Connect Your Wallet</Text>
              <Text style={styles.connectDescription}>
                Connect your Web3 wallet to enable blockchain features like transaction anchoring and enhanced security.
              </Text>

              <TouchableOpacity
                style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
                onPress={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="white" />
                    <Text style={styles.connectButtonText}>Connect Wallet</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.supportedWallets}>
                <Text style={styles.supportedWalletsTitle}>Supported Wallets:</Text>
                <View style={styles.walletsList}>
                  <View style={styles.walletItem}>
                    <Ionicons name="logo-chrome" size={20} color="#F56500" />
                    <Text style={styles.walletName}>MetaMask</Text>
                  </View>
                  <View style={styles.walletItem}>
                    <Ionicons name="link" size={20} color="#3B99FC" />
                    <Text style={styles.walletName}>WalletConnect</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.connectedSection}>
            {/* Wallet Info Card */}
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <View style={styles.walletIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                </View>
                <Text style={styles.walletStatus}>Wallet Connected</Text>
              </View>

              <View style={styles.walletDetails}>
                <View style={styles.walletDetailRow}>
                  <Text style={styles.walletDetailLabel}>Address</Text>
                  <TouchableOpacity style={styles.addressContainer}>
                    <Text style={styles.walletDetailValue}>{formatAddress(walletConnection.address)}</Text>
                    <Ionicons name="copy-outline" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.walletDetailRow}>
                  <Text style={styles.walletDetailLabel}>Balance</Text>
                  <Text style={styles.walletDetailValue}>
                    {walletConnection.balance ? formatBalance(walletConnection.balance) : '0.0000'} MATIC
                  </Text>
                </View>

                <View style={styles.walletDetailRow}>
                  <Text style={styles.walletDetailLabel}>Network</Text>
                  <Text style={styles.walletDetailValue}>
                    {networkInfo?.networkName || 'Unknown Network'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Network Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Blockchain Actions</Text>

              <TouchableOpacity style={styles.actionCard} onPress={switchToPolygon}>
                <View style={styles.actionLeft}>
                  <Ionicons name="swap-horizontal" size={24} color="#8B5CF6" />
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Switch to Polygon</Text>
                    <Text style={styles.actionDescription}>Use Polygon network for lower gas fees</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={anchorTransaction}>
                <View style={styles.actionLeft}>
                  <Ionicons name="link" size={24} color="#FF9500" />
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Anchor Transactions</Text>
                    <Text style={styles.actionDescription}>Store transaction proof on blockchain</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>

            {/* Security Features */}
            <View style={styles.securitySection}>
              <Text style={styles.sectionTitle}>Security Features</Text>
              <View style={styles.securityCard}>
                <View style={styles.securityFeature}>
                  <Ionicons name="shield-checkmark" size={20} color="#34C759" />
                  <Text style={styles.securityText}>Transactions are hash-chained locally</Text>
                </View>
                <View style={styles.securityFeature}>
                  <Ionicons name="link" size={20} color="#007AFF" />
                  <Text style={styles.securityText}>Daily merkle roots can be anchored on-chain</Text>
                </View>
                <View style={styles.securityFeature}>
                  <Ionicons name="lock-closed" size={20} color="#FF9500" />
                  <Text style={styles.securityText}>All data encrypted locally on your device</Text>
                </View>
              </View>
            </View>

            {/* Disconnect Button */}
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectWallet}>
              <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  connectSection: {
    padding: 20,
  },
  connectCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
  },
  connectDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 8,
    marginBottom: 32,
  },
  connectButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  supportedWallets: {
    alignSelf: 'stretch',
  },
  supportedWalletsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  walletsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletItem: {
    alignItems: 'center',
    gap: 8,
  },
  walletName: {
    fontSize: 12,
    color: '#666',
  },
  connectedSection: {
    padding: 20,
  },
  walletCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletIcon: {
    marginRight: 12,
  },
  walletStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  walletDetails: {
    gap: 16,
  },
  walletDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  walletDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  securitySection: {
    marginBottom: 24,
  },
  securityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});