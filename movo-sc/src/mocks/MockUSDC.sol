// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title MockUSDC
 * @dev Simplified mock USDC token contract for frontend testing
 * Only includes essential functions: mint, burn, and basic ERC20
 */
contract MockUSDC is ERC20, Ownable {
    
    // ============ CONSTRUCTOR ============
    
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Mint new USDC tokens (public for easy testing)
     * @param _to Address to mint tokens to
     * @param _amount Amount of USDC to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        
        _mint(_to, _amount);
    }
    
    /**
     * @dev Burn USDC tokens
     * @param _amount Amount of USDC to burn
     */
    function burn(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _burn(msg.sender, _amount);
    }
    
    // ============ OVERRIDE FUNCTIONS ============
    
    /**
     * @dev Override decimals to return 6 (USDC has 6 decimal places)
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
