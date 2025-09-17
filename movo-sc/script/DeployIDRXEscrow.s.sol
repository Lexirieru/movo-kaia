// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowIDRX.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployIDRXEscrow
 * @dev Script to deploy the EscrowIDRX contract
 */
contract DeployIDRXEscrow is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EscrowIDRX contract
        // Fee recipient is already set to 0x63470E56eFeB1759F3560500fB2d2FD43A86F179
        EscrowIDRX escrowIDRX = new EscrowIDRX();
        
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("EscrowIDRX deployed at:", address(escrowIDRX));
        console.log("Fee recipient set to: 0x63470E56eFeB1759F3560500fB2d2FD43A86F179");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Log contract details
        console.log("Platform fee:", escrowIDRX.platformFeeBps(), "basis points (0.25%)");
        console.log("Note: IDRX escrow contract - supports IDRX token with fiat conversion");
    }
}