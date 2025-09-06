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
 * @title MockIDRX
 * @dev Simplified mock IDRX token contract for frontend testing
 * Only includes essential functions: burnWithAccountNumber, burn, mint, and basic ERC20
 */
contract MockIDRX is ERC20, Ownable {
    
    // ============ EVENTS ============
    
    event BurnWithAccountNumber(
        address indexed _user,       // User address (same as mainnet event)
        uint256 amount,
        string hashedAccountNumber
    );
    
    // ============ CONSTRUCTOR ============
    
    constructor() ERC20("Mock IDRX", "mIDRX") Ownable(msg.sender) {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**2); // 10M IDRX (2 decimals)
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Burn IDRX with hashed account number for fiat withdrawal
     * @param _amount Amount of IDRX to burn
     * @param _hashedAccountNumber Hashed account number for fiat processing
     */
    function burnWithAccountNumber(
        uint256 _amount,
        string memory _hashedAccountNumber
    ) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_hashedAccountNumber).length > 0, "Hashed account number required");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _burn(msg.sender, _amount);
        
        emit BurnWithAccountNumber(
            msg.sender,
            _amount,
            _hashedAccountNumber
        );
    }
    
    /**
     * @dev Burn IDRX (basic burn function)
     * @param _amount Amount of IDRX to burn
     */
    function burn(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _burn(msg.sender, _amount);
    }
    
    /**
     * @dev Mint new IDRX tokens (public for easy testing)
     * @param _to Address to mint tokens to
     * @param _amount Amount of IDRX to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        
        _mint(_to, _amount);
    }
    
    // ============ OVERRIDE FUNCTIONS ============
    
    /**
     * @dev Override decimals to return 2 (IDRX has 2 decimal places)
     */
    function decimals() public view virtual override returns (uint8) {
        return 2;
    }
}
