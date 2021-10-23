// SPDX-License-Identifier: MIT
// Copyright (c) 2021 Benjamin Bryant LLC
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @dev ERC721 token with contract URI.
 *
 * conforms to OpenSea ContractURI spec
 * See {https://docs.opensea.io/docs/contract-level-metadata}
 *
 *
 */
abstract contract OpenSeaContractURI is ERC721 {
    /**
     * @dev View only resource for contract level metadata uri
     * See {https://docs.opensea.io/docs/contract-level-metadata}.
     */
    function contractURI() public view returns (string memory) {
        string memory baseURI = _baseURI();
        string memory contractPath = _contractPath();

        if (bytes(baseURI).length == 0) {
            return "";
        }

        if (bytes(contractPath).length == 0) {
            return "";
        }

        return string(abi.encodePacked(baseURI, contractPath));
    }

    /**
     * @dev Contract path for  for computing {contractURI}. If set, the resulting URI for each
     * contract metadataa will be the concatenation of the `baseURI` and the `contractPath`. Empty
     *  by default, can be overriden in child contracts.
     */
    function _contractPath() internal view virtual returns (string memory) {
        return "";
    }
}
