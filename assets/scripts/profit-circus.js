let ethereumWalletConnect = require('ethereum-wallet-connect');
let ethereumContract = require('ethereum-contract');

cc.Class({
	extends: cc.Component,

	properties: {
		seasonId: cc.Label,
		contractAbi: "Staking",
		movrContractAbi: "Staking",
		newContractAbi: "Staking",

		claimNftButton: cc.Button,

		withdraw: cc.Label,
		withdrawButton: cc.Button,

		ethContractAddress: "0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1",
		bscContractAddress: "0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1",
		movrContractAddress: "0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1",

		ethSessionId: 1,
		bscSessionId: 56,
		movrSessionId: 1285
	},

	getContract() {
		let contractName = "profitCircus" + this.seasonId.string;
		return cc[contractName];
	},

	onLoad() {
		this.claimNftButton.node.on('click', this.onClaimNft, this);
		this.withdrawButton.node.on('click', this.onWithdrawAll, this);

		cc.ethereumContract = ethereumContract;

		web3.eth.net.getId()
			.then(function (netId) {
				this.netId = netId;
				if (netId == 1) {
					this.sessionId = this.ethSessionId;
					this.contractAddress = this.ethContractAddress;

					this.node.active = parseInt(this.seasonId.string) != 1 && parseInt(this.node.name) != 1;

					switch (parseInt(this.node.name)) {
						case 1:
							return;
						case 2:
							break;
						case 3:
							// this.contractAbi = this.newContractAbi;
							break;
					}

				} else if (netId == 56) {
					this.sessionId = this.bscSessionId;
					this.contractAddress = this.bscContractAddress;

					switch (parseInt(this.node.name)) {
						case 1:
							break;
						case 2:
							// this.contractAbi = this.newContractAbi;
							break;
						case 3:
							// this.contractAbi = this.newContractAbi;
							break;
					}

				} else if (netId == 1285) {
					this.sessionId = this.movrSessionId;
					this.contractAddress = this.movrContractAddress;
					this.contractAbi = this.movrContractAbi;
				}

				if (!this.sessionId) {
					// this.node.active = false;
					return;
				}

				this.loadContract()
					.then(() => {
						this.initSeason();
					})
					.catch((err) => {
						alert("Failed to init the season " + this.seasonId.string);
						console.error(err);
					});
			}.bind(this))
			.catch((err) => {
				console.log(err);
			})

	},


	loadContract() {
		return new Promise((resolve, reject) => {
			// LP Mining (aka Staking game smartcontract

			// Nft Staking, the third game in seascape network
			cc.ethereumContract
				.loadContract(this.contractAddress, this.contractAbi, cc.walletAddress)
				.then((contract) => {
					let contractName = "profitCircus" + this.seasonId.string;
					cc[contractName] = contract;
					resolve();
				})
				.catch((err) => {
					cc.error(err);
					reject();
				});
		});
	},

	isStartedFor(session) {
		let totalReward = parseFloat(web3.utils.fromWei(session.totalReward));

		if (totalReward == 0) {
			return false;
		}

		let now = Math.floor(Date.now() / 1000);

		let startTime = parseInt(session.startTime);
		let period = parseInt(session.period);

		return now < (startTime + period);
	},

	initSeason() {
		// session is a general data about the game
		let contract = this.getContract();

		contract.methods.sessions(this.sessionId).call()
			.then((session) => {
				this.session = session;

				this.setSessionEnd(session);

				contract.methods.balances(this.sessionId, cc.walletAddress).call().then((balance) => {
					this.balance = balance;

					this.withdraw.string = parseFloat(web3.utils.fromWei(this.balance.amount, "ether"));

					// this.claimNftButton.interactable = balance.amount > 0 && balance.minted === false;

					this.withdrawButton.interactable = parseFloat(this.withdraw.string) > 0;

					this.setSessionEnd(session);
				});
			});
	},

	setSessionEnd(session) {
		this.sessionEnd = (parseInt(session.startTime) + parseInt(session.period)) * 1000;

		this.left = this.sessionEnd - Date.now();

		if (this.left <= 0) {
			console.log(`Session Ended`);
		} else {
			console.log(`Session ends in ${new Date(this.sessionEnd).toString()}`);
		}
	},

	////////////////////////////////////////////////////    

	onWithdrawAll() {
		if (!this.sessionId) {
			alert('Unsupported Season in this Blockchain!');
			return;
		}

		if (parseInt(this.seasonId.string) == 1 && parseInt(this.node.name) == 1 && this.netId == 1) {
			alert('Please contact our customer service!');
			return;
		}

		return new Promise((resolve, reject) => {
			let depositAmount = web3.utils.toWei(this.balance.amount, 'ether');
			if (depositAmount == 0) {
				alert("No staked token to withdraw!");
				return;
			}

			let contract = this.getContract();

			contract.methods.withdraw(this.sessionId, this.balance.amount).send()
				.on('receipt', () => {
					this.withdraw.string = "0";
				})
				.on('error', (err) => {
					cc.error(err);
				});
		});
	},

	onClaimNft() {
		if (!this.sessionId) {
			alert('Unsupported Season in this Blockchain!');
			return;
		}

		let contract = this.getContract();

		if (parseInt(this.seasonId.string) == 1 && parseInt(this.node.name) == 1 && this.netId == 1) {
			alert('Please contact our customer service!');
			return;
		}

		if (this.balance.minted) {
			alert("Token already minted!");
			return;
		}

		if (this.contractAbi == "ProfitCircusOld") {
			contract.methods.claimNFT(this.sessionId)
				.send()
				.on('receipt', (receipt) => {
					this.balance.minted = true;
					this.claimNftButton.interactable = false;
					this.withdrawButton.interactable = parseFloat(this.withdraw.string) > 0;
					alert("Nft claimed");
				})
				.on('error', (err) => {
					cc.error(err);
				});
		} else {
			contract.methods.claimNft(this.sessionId)
				.send()
				.on('receipt', (receipt) => {
					this.balance.minted = true;
					this.claimNftButton.interactable = false;
					this.withdrawButton.interactable = parseFloat(this.withdraw.string) > 0;
					alert("Nft claimed");
				})
				.on('error', (err) => {
					cc.error(err);
				});
		}
	},
});
