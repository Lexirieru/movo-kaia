// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowUSDC.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployUSDCEscrow
 * @dev Script to deploy the EscrowUSDC contract
 */
contract DeployUSDCEscrow is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EscrowUSDC contract
        // Fee recipient is already set to 0x63470E56eFeB1759F3560500fB2d2FD43A86F179
        EscrowUSDC escrowUSDC = new EscrowUSDC();
        
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("EscrowUSDC deployed at:", address(escrowUSDC));
        console.log("Fee recipient set to: 0x63470E56eFeB1759F3560500fB2d2FD43A86F179");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Log contract details
        console.log("Platform fee:", escrowUSDC.platformFeeBps(), "basis points (0.25%)");
        console.log("Min escrow amount:", escrowUSDC.minEscrowAmount(), "USDC (6 decimals)");
        console.log("Max escrow amount:", escrowUSDC.maxEscrowAmount(), "USDC (6 decimals)");
    }
}
