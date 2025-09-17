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
 * @title MockUSDT
 * @dev Simplified mock USDT token contract for frontend testing
 * Only includes essential functions: mint, burn, and basic ERC20
 */
contract MockUSDT is ERC20, Ownable {
    
    // ============ STATE VARIABLES ============
    
    uint8 private _decimals;
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Constructor that initializes the mock USDT token
     * Mints 1 billion USDT to the deployer
     */
    constructor() ERC20("Mock Tether USD", "USDT") Ownable(msg.sender) {
        _decimals = 6; // USDT has 6 decimals
        _mint(msg.sender, 1000000000 * 10**_decimals); // 1B USDT
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Mint new USDT tokens (public for easy testing)
     * @param _to Address to mint tokens to
     * @param _amount Amount of USDT to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        
        _mint(_to, _amount);
    }
    
    /**
     * @dev Burn USDT tokens
     * @param _amount Amount of USDT to burn
     */
    function burn(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance to burn");
        
        _burn(msg.sender, _amount);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Returns the number of decimals used to get its user representation
     * @return The number of decimals (6 for USDT)
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}