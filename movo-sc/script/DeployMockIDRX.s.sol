// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/mocks/MockIDRX.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployMockIDRX
 * @dev Script to deploy the MockIDRX contract for testing
 */
contract DeployMockIDRX is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockIDRX contract
        MockIDRX mockIDRX = new MockIDRX();
        
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("MockIDRX deployed at:", address(mockIDRX));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Log contract details
        console.log("Token name:", mockIDRX.name());
        console.log("Token symbol:", mockIDRX.symbol());
        console.log("Decimals:", mockIDRX.decimals());
        console.log("Total supply:", mockIDRX.totalSupply(), "IDRX (2 decimals)");
        console.log("Initial balance:", mockIDRX.balanceOf(vm.addr(deployerPrivateKey)), "IDRX (2 decimals)");
    }
}
