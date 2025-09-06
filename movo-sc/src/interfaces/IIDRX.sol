// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
███╗░░░███╗░█████╗░██╗░░░██╗░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title IIDRX
 * @dev Interface for IDRX contract used for fiat withdrawal
 */
interface IIDRX {
    /**
     * @dev Burn IDRX with account number for fiat withdrawal
     * @param amount Amount of IDRX to burn
     * @param accountNumber Hashed bank account number
     */
    function burnWithAccountNumber(uint256 amount, string memory accountNumber) external;
    
    /**
     * @dev Get balance of an account
     * @param account Address to check balance
     * @return Balance of the account
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @dev Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success status
     */
    function transfer(address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Transfer from one address to another
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success status
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Approve spender
     * @param spender Spender address
     * @param amount Amount to approve
     * @return Success status
     */
    function approve(address spender, uint256 amount) external returns (bool);
    
    /**
     * @dev Get allowance
     * @param owner Owner address
     * @param spender Spender address
     * @return Allowance amount
     */
    function allowance(address owner, address spender) external view returns (uint256);
    
    /**
     * @dev Get total supply
     * @return Total supply
     */
    function totalSupply() external view returns (uint256);
    
    /**
     * @dev Get decimals
     * @return Number of decimals
     */
    function decimals() external view returns (uint8);
    
    /**
     * @dev Get symbol
     * @return Token symbol
     */
    function symbol() external view returns (string memory);
    
    /**
     * @dev Get name
     * @return Token name
     */
    function name() external view returns (string memory);
}
