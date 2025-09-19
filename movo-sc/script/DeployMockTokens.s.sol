// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockUSDT.sol";
import "../src/mocks/MockIDRX.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██║░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title DeployMockTokens
 * @author Movo Team
 * @notice Unified deployment script for all mock tokens
 * @dev To deploy a specific token, uncomment the corresponding section below
 *      and comment out the others. This allows for easy deployment of any
 *      mock token without maintaining separate deployment scripts.
 * @custom:security-contact security@movo.com
 */
contract DeployMockTokens is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC (6 decimals)
        MockUSDC mockUSDC = new MockUSDC();
        // vm.stopBroadcast();
        // logTokenDetails("MockUSDC", address(mockUSDC), mockUSDC.name(), mockUSDC.symbol(), mockUSDC.decimals(), mockUSDC.totalSupply(), "USDC (6 decimals)");
        
        // Deploy MockUSDT (6 decimals)
        MockUSDT mockUSDT = new MockUSDT();
        // vm.stopBroadcast();
        // logTokenDetails("MockUSDT", address(mockUSDT), mockUSDT.name(), mockUSDT.symbol(), mockUSDT.decimals(), mockUSDT.totalSupply(), "USDT (6 decimals)");
        
        // Deploy MockIDRX (2 decimals)
        MockIDRX mockIDRX = new MockIDRX();
        vm.stopBroadcast();
        // logTokenDetails("MockIDRX", address(mockIDRX), mockIDRX.name(), mockIDRX.symbol(), mockIDRX.decimals(), mockIDRX.totalSupply(), "IDRX (2 decimals)");
    }
    
    /**
     * @notice Logs token deployment details
     * @dev Helper function to standardize logging across all token deployments
     * @param tokenName The name of the token being deployed
     * @param tokenAddress The deployed contract address
     * @param name The token's name
     * @param symbol The token's symbol
     * @param decimals The token's decimal places
     * @param totalSupply The token's total supply
     * @param unitDescription Description of the token unit for logging
     */
    function logTokenDetails(
        string memory tokenName,
        address tokenAddress,
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply,
        string memory unitDescription
    ) internal view {
        // Log deployment information
        console.log("==========================================");
        console.log("%s deployed at:", tokenName);
        console.log(tokenAddress);
        console.log("Deployer address:", vm.addr(vm.envUint("PRIVATE_KEY")));
        console.log("==========================================");
        
        // Log contract details
        console.log("Token name:", name);
        console.log("Token symbol:", symbol);
        console.log("Decimals:", decimals);
        console.log("Total supply:", totalSupply, unitDescription);
        console.log("Initial balance:", IERC20(tokenAddress).balanceOf(vm.addr(vm.envUint("PRIVATE_KEY"))), unitDescription);
        console.log("==========================================");
    }
}