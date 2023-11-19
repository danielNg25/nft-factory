import {
    useAddress,
    ConnectWallet,
    Web3Button,
    useConnectionStatus,
    useContract,
    useContractWrite,
    useContractRead,
    useSDK,
} from '@thirdweb-dev/react';

import {
    Multicall,
    ContractCallResults,
    ContractCallContext,
} from 'ethereum-multicall';
import './styles/Home.css';
import { NFTFactoryABI } from './abi/NFTFactory';
import 'bootstrap/dist/css/bootstrap.css';
import { InputGroup, Form, Table } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { NFTABI } from './abi/NFT';

const NFT_FACTORY_ADDRESS = '0x350538Ae3ca47319f83A67F4C70B9f57A5E18F2A';
const NFT_CREATED_EVENT = 'NFTCreated';

type NFTListItem = {
    address: string;
    name: string;
    symbol: string;
};

export default function Home() {
    const address = useAddress();
    const sdk = useSDK();
    const connectionStatus = useConnectionStatus();
    const [nftName, setNFTName] = useState<string>('');
    const [nftSymbol, setNFTSymbol] = useState<string>('');
    const [nftURI, setNFTURI] = useState<string>('');
    const [txHash, setTxHash] = useState<string>('');
    const [newNFT, setNewNFT] = useState<string>('');
    const [NFTList, setNFTList] = useState<NFTListItem[]>([]);

    const { contract } = useContract(NFT_FACTORY_ADDRESS);
    const { mutateAsync, isLoading, error } = useContractWrite(
        contract,
        'createNFT'
    );

    const userNFTCount = useContractRead(contract, 'getNFTCount', [address]);

    useEffect(() => {
        if (
            address &&
            sdk &&
            userNFTCount.data &&
            userNFTCount.data.toNumber() > 0
        ) {
            const length = userNFTCount.data.toNumber();
            const multicall = new Multicall({
                ethersProvider: sdk.getProvider(),
            });
            const NFTList: NFTListItem[] = Array.from({ length }, () => ({
                address: '',
                name: '',
                symbol: '',
            }));
            const NFTAddressesMulticallContext: ContractCallContext = {
                reference: 'NFTFactory',
                contractAddress: NFT_FACTORY_ADDRESS,
                abi: NFTFactoryABI,
                calls: NFTList.map((_, index) => {
                    return {
                        reference: index.toString(),
                        methodName: 'getNFT',
                        methodParameters: [address, index],
                    };
                }),
            };

            multicall
                .call([NFTAddressesMulticallContext])
                .then((results: ContractCallResults) => {
                    results.results['NFTFactory'].callsReturnContext.forEach(
                        (item, index) => {
                            NFTList[index].address = item.returnValues[0];
                        }
                    );

                    const NFTDetailsMulticallContext: ContractCallContext[] =
                        NFTList.map((item, index) => {
                            return {
                                reference: index.toString(),
                                contractAddress: item.address,
                                abi: NFTABI,
                                calls: [
                                    {
                                        reference: 'name',
                                        methodName: 'name',
                                        methodParameters: [],
                                    },
                                    {
                                        reference: 'symbol',
                                        methodName: 'symbol',
                                        methodParameters: [],
                                    },
                                ],
                            };
                        });

                    multicall
                        .call(NFTDetailsMulticallContext)
                        .then((results: ContractCallResults) => {
                            NFTList.map((item, index) => {
                                item.name =
                                    results.results[
                                        index.toString()
                                    ].callsReturnContext[0].returnValues[0];
                                item.symbol =
                                    results.results[
                                        index.toString()
                                    ].callsReturnContext[1].returnValues[0];
                            });
                            NFTList.reverse();
                            setNFTList(NFTList);
                        });
                });
        }
    }, [userNFTCount.data, address]);

    const handleMintNFT = async () => {
        if (!nftName || !nftSymbol || !nftURI) {
            alert('Please fill all the fields');
            return;
        }

        const res = await mutateAsync({ args: [nftName, nftSymbol, nftURI] });
        const { events } = res.receipt as any;
        setTxHash(res.receipt.transactionHash);
        setNewNFT(
            events.find((e: any) => e.event == NFT_CREATED_EVENT).args.clone
        );
    };

    const handleClickTx = () => {
        (window as any)
            .open('https://testnet.bscscan.com/tx/' + txHash, '_blank')
            .focus();
    };

    const handleClickNFT = () => {
        (window as any)
            .open(
                'https://testnet.bscscan.com/address/' + newNFT + '#code',
                '_blank'
            )
            .focus();
    };

    return (
        <main className="main">
            <div className="container">
                <div className="header">
                    <h1 className="title">
                        Welcome to{' '}
                        <span className="gradient-text-0">
                            <a>NFT Factory</a>
                        </span>
                    </h1>

                    <div className="connect">
                        <ConnectWallet
                            dropdownPosition={{
                                side: 'bottom',
                                align: 'center',
                            }}
                        />
                    </div>
                </div>

                {connectionStatus == 'connected' ? (
                    <div>
                        <div className="form">
                            <InputGroup className="mb-3">
                                <InputGroup.Text id="basic-addon1">
                                    Name
                                </InputGroup.Text>
                                <Form.Control
                                    // placeholder="Eg: Apes of the Jungle"
                                    aria-label="NFTName"
                                    aria-describedby="basic-addon1"
                                    onChange={(e) => {
                                        setNFTName(e.target.value);
                                    }}
                                />
                            </InputGroup>
                            <InputGroup className="mb-3">
                                <InputGroup.Text id="basic-addon1">
                                    Symbol
                                </InputGroup.Text>
                                <Form.Control
                                    // placeholder="Eg: APE"
                                    aria-label="Symbol"
                                    aria-describedby="basic-addon1"
                                    onChange={(e) => {
                                        setNFTSymbol(e.target.value);
                                    }}
                                />
                            </InputGroup>

                            <InputGroup className="mb-3">
                                <InputGroup.Text id="basic-addon1">
                                    URI
                                </InputGroup.Text>
                                <Form.Control
                                    // placeholder="Eg: ipfs://QmbdiM2EE6ccqdEX3XH6YfuvBZmc1v8VBphfpKueZqVmML/1"
                                    aria-label="URI"
                                    aria-describedby="basic-addon1"
                                    onChange={(e) => {
                                        setNFTURI(e.target.value);
                                    }}
                                />
                            </InputGroup>
                        </div>

                        <div>
                            <Web3Button
                                contractAddress={NFT_FACTORY_ADDRESS}
                                action={handleMintNFT}
                            >
                                Mint
                            </Web3Button>
                        </div>

                        {!txHash ? (
                            <></>
                        ) : (
                            <div>
                                View your transaction:{' '}
                                <a className="hover" onClick={handleClickTx}>
                                    {txHash}
                                </a>
                            </div>
                        )}

                        {!newNFT ? (
                            <></>
                        ) : (
                            <div>
                                View your NFT contract:{' '}
                                <a className="hover" onClick={handleClickNFT}>
                                    {newNFT}
                                </a>
                            </div>
                        )}

                        <h2 className="bold margin-vertical">
                            Your created NFTs:{' '}
                            {userNFTCount && userNFTCount.data
                                ? userNFTCount.data.toString()
                                : '0'}
                        </h2>

                        <Table bordered>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Address</th>
                                    <th>Name</th>
                                    <th>Symbol</th>
                                </tr>
                            </thead>
                            {!NFTList ? (
                                <></>
                            ) : (
                                <tbody>
                                    {NFTList.map((item, index) => {
                                        return (
                                            <tr>
                                                <td>{index + 1}</td>
                                                <td>{item.address}</td>
                                                <td>{item.name}</td>
                                                <td>{item.symbol}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            )}
                        </Table>
                    </div>
                ) : (
                    <div></div>
                )}
            </div>
        </main>
    );
}
