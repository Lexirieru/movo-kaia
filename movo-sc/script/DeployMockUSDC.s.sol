// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/mocks/MockUSDC.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployMockUSDC
 * @dev Script to deploy the MockUSDC contract for testing
 */
contract DeployMockUSDC is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC contract
        MockUSDC mockUSDC = new MockUSDC();
        
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("MockUSDC deployed at:", address(mockUSDC));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Log contract details
        console.log("Token name:", mockUSDC.name());
        console.log("Token symbol:", mockUSDC.symbol());
        console.log("Decimals:", mockUSDC.decimals());
        console.log("Total supply:", mockUSDC.totalSupply(), "USDC (6 decimals)");
        console.log("Initial balance:", mockUSDC.balanceOf(vm.addr(deployerPrivateKey)), "USDC (6 decimals)");
    }
}
