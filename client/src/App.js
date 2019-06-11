import React, { Component } from "react";
import getWeb3, {
  getGanacheWeb3,
  useRelayer,
  useEphermeralRelay,
  useInjectedWeb3
} from "./utils/getWeb3";
import { Loader } from "rimble-ui";

import ChatContainer from "./components/Chatcontainer/index";
import styles from "./App.module.scss";
import { zeppelinSolidityHotLoaderOptions } from "../config/webpack";

console.log("React VErsion: ", React.version);
class App extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      signingAccount: null,
      storageValue: 0,
      web3: null,
      ganacheWeb3: null,
      accounts: null,
      route: window.location.pathname.replace("/", ""),
      metaTxSigner: "MetaMask",
      setProvider: null
    };

    this.setMetaTxSigner = this.setMetaTxSigner.bind(this);
  }

  setMetaTxSigner = async signer => {
    let signingAccount;
    switch (signer) {
      case "MetaMask":
        await useInjectedWeb3(this.state.web3);
        signingAccount = this.state.accounts[0];
        this.setState({});
        console.log("Using regular transaction flow");
        this.setState({ signingAccount });
        break;
      case "MMSigner":
        await useRelayer(this.state.web3);
        signingAccount = this.state.accounts[0];
        console.log("Using Metamask to sign");
        this.setState({ signingAccount });
        break;
      case "Ephemeral":
        signingAccount = await useEphermeralRelay(this.state.web3);
        console.log("Using Ephemeral KeyPair: ", signingAccount);
        this.setState({ signingAccount });
        break;
      default:
        await getWeb3();
    }
  };

  getGanacheAddresses = async () => {
    if (!this.ganacheProvider) {
      this.ganacheProvider = getGanacheWeb3();
    }
    if (this.ganacheProvider) {
      return await this.ganacheProvider.eth.getAccounts();
    }

    return [];
  };

  componentDidMount = async () => {
    const hotLoaderDisabled = zeppelinSolidityHotLoaderOptions.disabled;
    let ChatApp = {};
    try {
      ChatApp = require("../../contracts/ChatApp.sol");
      //console.log("Chat app: ", ChatApp);
    } catch (e) {
      console.log(e);
    }

    try {
      const isProd = process.env.NODE_ENV === "production";
      if (!isProd) {
        // Get network provider and web3 instance.
        const web3 = await getWeb3();
        const ganacheAccounts = await this.getGanacheAddresses();
        const ganacheWeb3 = await getGanacheWeb3();
        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();
        const signingAccount = accounts[0];
        // Get the contract instance.
        const networkId = await web3.eth.net.getId();
        const networkType = await web3.eth.net.getNetworkType();
        const isMetaMask = web3.currentProvider.isMetaMask;
        let balance =
          accounts.length > 0
            ? await web3.eth.getBalance(accounts[0])
            : web3.utils.toWei("0");
        balance = web3.utils.fromWei(balance, "ether");
        let instance = null;
        let deployedNetwork = null;
        //console.log("Chat App: ", ChatApp);
        if (ChatApp.networks) {
          deployedNetwork = ChatApp.networks[networkId.toString()];
          //console.log("Deployed Network: ", deployedNetwork);
          if (deployedNetwork) {
            instance = new web3.eth.Contract(
              ChatApp.abi,
              deployedNetwork && deployedNetwork.address
            );
          }
        }

        this.setState({
          web3,
          ganacheAccounts,
          signingAccount,
          accounts,
          balance,
          networkId,
          isMetaMask,
          instance,
          networkType,
          ChatApp,
          setProvider: this.setMetaTxSigner,
          ganacheWeb3
        });
        //useRelayer(this.state.web3);
        //useEphermeralRelay(this.state.web3);
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  renderLoader() {
    return (
      <div className={styles.loader}>
        <Loader size="80px" color="red" />
        <h3> Loading Web3, accounts, and contract...</h3>
        <p> Unlock your metamask </p>
      </div>
    );
  }

  render() {
    if (!this.state.web3) {
      return this.renderLoader();
    }
    return (
      <div className={styles.App}>
        <h1>GSN Chat APP</h1>
        <p />
        <ChatContainer {...this.state} {...this.setMetaTxSigner} />
      </div>
    );
  }
}

export default App;
