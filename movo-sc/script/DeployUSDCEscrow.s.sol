// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Escrow.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployEscrow
 * @dev Script to deploy the Escrow contract
 */
contract DeployEscrow is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Escrow contract
        // Fee recipient is already set to 0x63470E56eFeB1759F3560500fB2d2FD43A86F179
        Escrow escrow = new Escrow();
        
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("Escrow deployed at:", address(escrow));
        console.log("Fee recipient set to: 0x63470E56eFeB1759F3560500fB2d2FD43A86F179");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Log contract details
        console.log("Platform fee:", escrow.platformFeeBps(), "basis points (0.25%)");
        console.log("Note: Generic escrow contract - supports USDC, USDT, and other ERC20 tokens");
    }
}