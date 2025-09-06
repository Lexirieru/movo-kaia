// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IIDRX.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██║░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title EscrowIDRX
 * @dev Smart contract for IDRX escrow system designed for long-term usage
 * 
 * FEATURES:
 * - Long-term escrow that can be reused for recurring payments
 * - Add/remove receivers dynamically
 * - Edit amounts for existing receivers
 * - Top-up funds to existing escrow
 * - Long-term payment management
 * - Crypto and fiat withdrawal options
 * 
 * USE CASE EXAMPLE:
 * - January: 5 receivers, 200 IDRX each, total 1000 IDRX
 * - February: Same 5 receivers, same amounts, top-up 1000 IDRX
 * - March: Increase each receiver by 100 IDRX (300 IDRX each), top-up 1500 IDRX
 * - Receiver can withdraw anytime according to allocation (no cycle restrictions)
 */
contract EscrowIDRX is ReentrancyGuard, Ownable, Pausable {
    
    // ============ STRUCTS ============
    
    struct Receiver {
        address receiverAddress;
        uint256 currentAllocation;    // Current allocation amount
        uint256 withdrawnAmount;      // Total amount withdrawn
        bool isActive;                // Receiver still active
    }
    
    struct EscrowRoom {
        address sender;
        uint256 totalAllocatedAmount;     // Total amount allocated to all receivers
        uint256 totalDepositedAmount;     // Total amount deposited by sender
        uint256 totalWithdrawnAmount;     // Total amount withdrawn
        uint256 availableBalance;         // Available balance for withdrawals (only from topUpFunds)
        bool isActive;
        uint256 createdAt;
        uint256 lastTopUpAt;             // Last time funds were added
        mapping(address => Receiver) receivers;
        address[] receiverAddresses;
        uint256 activeReceiverCount;
    }
    
    // ============ STATE VARIABLES ============
    
    mapping(bytes32 => EscrowRoom) public escrowRooms;
    mapping(address => bytes32[]) public userEscrows; // Sender escrows
    mapping(address => bytes32[]) public receiverEscrows; // Receiver escrows
    
    // IDRX contract address
    address public constant IDRX_ADDRESS = 0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22; // Mock IDRX Base Testnet
    
    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFeeBps = 25; // 0.25%
    address public feeRecipient = 0x63470E56eFeB1759F3560500fB2d2FD43A86F179;
    
    // Minimum and maximum amounts (2 decimals)
    uint256 public minEscrowAmount = 20000 * 10**2; // 20,000 IDRX
    uint256 public maxEscrowAmount = 1000000000 * 10**2; // 1B IDRX
    
        // ============ EVENTS ============
    
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 totalAmount,
        uint256 createdAt,
        address[] receivers,
        uint256[] amounts
    );
    
    event FundsTopUp(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 amount,
        uint256 newAvailableBalance
    );
    
    event ReceiverAdded(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount
    );
    
    event ReceiverRemoved(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 refundAmount
    );
    
    event ReceiverAmountUpdated(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 oldAmount,
        uint256 newAmount
    );
    
    event EscrowPaused(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 remainingBalance
    );
    
    event EscrowResumed(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 availableBalance
    );
    
    event IDRXWithdrawn(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount,
        address depositWallet
    );
    

    
    // ============ MODIFIERS ============
    
    modifier onlyEscrowSender(bytes32 _escrowId) {
        require(escrowRooms[_escrowId].sender == msg.sender, "Only escrow sender");
        _;
    }
    
    modifier escrowExists(bytes32 _escrowId) {
        require(escrowRooms[_escrowId].sender != address(0), "Escrow does not exist");
        _;
    }
    
    modifier escrowActive(bytes32 _escrowId) {
        require(escrowRooms[_escrowId].isActive, "Escrow is not active");
        _;
    }
    
    modifier receiverExists(bytes32 _escrowId, address _receiver) {
        require(escrowRooms[_escrowId].receivers[_receiver].receiverAddress != address(0), "Receiver does not exist");
        _;
    }
    
    modifier receiverActive(bytes32 _escrowId, address _receiver) {
        require(escrowRooms[_escrowId].receivers[_receiver].isActive, "Receiver is not active");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {
        // feeRecipient already set to default value
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Create new escrow room with multiple receivers
     * @param _receivers Array of receiver addresses
     * @param _amounts Array of amounts for each receiver
     * @return escrowId ID of the created escrow
     */
    function createEscrow(
        address[] memory _receivers,
        uint256[] memory _amounts
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(_receivers.length > 0, "At least one receiver required");
        require(_receivers.length == _amounts.length, "Receivers and amounts length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        // Check minimum and maximum amounts
        require(totalAmount >= minEscrowAmount, "Amount below minimum (20,000 IDRX)");
        require(totalAmount <= maxEscrowAmount, "Amount above maximum (1B IDRX)");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                IDRX_ADDRESS,
                totalAmount,
                block.timestamp,
                block.number
            )
        );
        
        EscrowRoom storage room = escrowRooms[escrowId];
        room.sender = msg.sender;
        room.totalAllocatedAmount = totalAmount;
        room.availableBalance = 0;  // Start from 0, no funds in escrow
        room.isActive = true;
        room.createdAt = block.timestamp;
        room.lastTopUpAt = block.timestamp;
        room.activeReceiverCount = _receivers.length;
        
        // Add receivers
        for (uint256 i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Invalid receiver address");
            require(_amounts[i] > 0, "Amount must be greater than 0");
            
            room.receivers[_receivers[i]] = Receiver({
                receiverAddress: _receivers[i],
                currentAllocation: _amounts[i],
                withdrawnAmount: 0,
                isActive: true
            });
            
            room.receiverAddresses.push(_receivers[i]);
            receiverEscrows[_receivers[i]].push(escrowId);
        }
        
        userEscrows[msg.sender].push(escrowId);
        
        emit EscrowCreated(
            escrowId,
            msg.sender,
            totalAmount,
            block.timestamp,
            _receivers,
            _amounts
        );
        
        return escrowId;
    }
    
    /**
     * @dev Top-up funds to existing escrow - amount must equal totalAllocatedAmount
     * @param _escrowId ID of escrow room
     * @param _amount Amount of IDRX to add (must equal total allocation)
     */
    function topUpFunds(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= maxEscrowAmount, "Amount above maximum (1B IDRX)");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Validation: amount must equal totalAllocatedAmount
        require(_amount == room.totalAllocatedAmount, "Amount must equal total allocated amount");
        
        // Transfer IDRX to escrow
        IERC20 idrx = IERC20(IDRX_ADDRESS);
        require(idrx.transferFrom(msg.sender, address(this), _amount), "Transfer to escrow failed");
        
        room.totalDepositedAmount += _amount;
        room.availableBalance += _amount;
                room.lastTopUpAt = block.timestamp;
        
        emit FundsTopUp(_escrowId, msg.sender, _amount, room.availableBalance);
    }
    
    /**
     * @dev Add new receiver to existing escrow - freely add receiver without balance requirement
     * @param _escrowId ID of escrow room
     * @param _receiver Address of new receiver
     * @param _amount Amount for new receiver (2-5000 IDRX)
     */
    function addReceiver(
        bytes32 _escrowId,
        address _receiver,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        require(_receiver != address(0), "Invalid receiver address");
        // Amount validation: minimum 2 IDRX, maximum 5000 IDRX
        require(_amount >= 2 * 10**2, "Amount below minimum (2 IDRX)");
        require(_amount <= 5000 * 10**2, "Amount above maximum (5000 IDRX)");
        require(escrowRooms[_escrowId].receivers[_receiver].receiverAddress == address(0), "Receiver already exists");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Add receiver without balance check
        room.receivers[_receiver] = Receiver({
            receiverAddress: _receiver,
            currentAllocation: _amount,
            withdrawnAmount: 0,
            isActive: true
        });
        
        room.receiverAddresses.push(_receiver);
        room.activeReceiverCount++;
        room.totalAllocatedAmount += _amount;
        // No need to reduce availableBalance
        
                receiverEscrows[_receiver].push(_escrowId);
        
        emit ReceiverAdded(_escrowId, _receiver, _amount);
    }
    
    /**
     * @dev Remove receiver from escrow - remove receiver from array and mark inactive
     * @param _escrowId ID of escrow room
     * @param _receiver Address of receiver to remove
     */
    function removeReceiver(
        bytes32 _escrowId,
        address _receiver
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        require(receiver.receiverAddress != address(0), "Receiver does not exist");
        require(receiver.isActive, "Receiver already inactive");
        
        uint256 remainingAllocation = receiver.currentAllocation;
        
        // Mark receiver as inactive
        receiver.isActive = false;
        room.activeReceiverCount--;
        room.totalAllocatedAmount -= remainingAllocation;
        
        // Remove address from receiverAddresses array
        for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
            if (room.receiverAddresses[i] == _receiver) {
                // Shift all elements after index i to the left
                for (uint256 j = i; j < room.receiverAddresses.length - 1; j++) {
                    room.receiverAddresses[j] = room.receiverAddresses[j + 1];
                }
                // Remove last element
                room.receiverAddresses.pop();
                break;
            }
        }
        
        // Reset receiver data so it can be added again
        delete room.receivers[_receiver];
        
        emit ReceiverRemoved(_escrowId, _receiver, remainingAllocation);
    }
    
    /**
     * @dev Update amount for existing receiver - freely change amount without balance requirement
     * @param _escrowId ID of escrow room
     * @param _receiver Address of receiver
     * @param _newAmount New amount for receiver (2-5000 IDRX)
     */
    function updateReceiverAmount(
        bytes32 _escrowId,
        address _receiver,
        uint256 _newAmount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        // Amount validation: minimum 2 IDRX, maximum 5000 IDRX
        require(_newAmount >= 2 * 10**2, "Amount below minimum (2 IDRX)");
        require(_newAmount <= 5000 * 10**2, "Amount above maximum (5000 IDRX)");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        require(receiver.receiverAddress != address(0), "Receiver does not exist");
        require(receiver.isActive, "Receiver is not active");
        
        uint256 oldAmount = receiver.currentAllocation;
        
        // Update amount without balance check
        room.totalAllocatedAmount = room.totalAllocatedAmount - oldAmount + _newAmount;
        receiver.currentAllocation = _newAmount;
        
        emit ReceiverAmountUpdated(_escrowId, _receiver, oldAmount, _newAmount);
    }
    
    /**
     * @dev Pause escrow (sender can pause to stop payments temporarily)
     * @param _escrowId ID of escrow room
     */
    function pauseEscrow(
        bytes32 _escrowId
    ) external nonReentrant escrowExists(_escrowId) onlyEscrowSender(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        require(room.isActive, "Escrow already paused");
        
        room.isActive = false;
        
        emit EscrowPaused(_escrowId, msg.sender, room.availableBalance);
    }
    
    /**
     * @dev Resume escrow (sender can resume after pausing)
     * @param _escrowId ID of escrow room
     */
    function resumeEscrow(
        bytes32 _escrowId
    ) external nonReentrant escrowExists(_escrowId) onlyEscrowSender(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        require(!room.isActive, "Escrow already active");
        
        room.isActive = true;
        
        emit EscrowResumed(_escrowId, msg.sender, room.availableBalance);
    }
    
    /**
     * @dev Close escrow permanently and refund remaining balance to sender
     * @param _escrowId ID of escrow room
     */
    function closeEscrow(
        bytes32 _escrowId
    ) external nonReentrant escrowExists(_escrowId) onlyEscrowSender(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        room.isActive = false;
        
        uint256 remainingBalance = room.availableBalance;
        
        if (remainingBalance > 0) {
            IERC20 idrx = IERC20(IDRX_ADDRESS);
            require(idrx.transfer(room.sender, remainingBalance), "Refund transfer failed");
        }
        
        emit EscrowPaused(_escrowId, msg.sender, remainingBalance);
    }
    
    /**
     * @dev Withdraw IDRX to crypto wallet (receiver's own wallet)
     * @param _escrowId ID of escrow room
     * @param _amount Total amount of IDRX to withdraw (fee will be deducted from this amount)
     */
    function withdrawIDRXToCrypto(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        require(receiver.receiverAddress == msg.sender, "Not authorized receiver");
        require(receiver.isActive, "Receiver is not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= receiver.currentAllocation, "Amount exceeds current allocation");
        
        // Calculate fee from the total amount
        uint256 fee = (_amount * platformFeeBps) / 10000;
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        
        IERC20 idrx = IERC20(IDRX_ADDRESS);
        
        // Transfer IDRX to crypto wallet
        require(idrx.transfer(msg.sender, netAmount), "Transfer to crypto wallet failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            require(idrx.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        
        emit IDRXWithdrawn(_escrowId, msg.sender, _amount, msg.sender);
    }
    
    /**
     * @dev Withdraw IDRX to fiat (smart contract burns IDRX, frontend handles redeem)
     * 
     * IMPORTANT: This function burns IDRX tokens using hashedAccountNumber from backend.
     * The actual fiat withdrawal must be handled by the frontend calling IDRX API after this transaction.
     * 
     * FLOW:
     * 1. Backend generates hashedAccountNumber from bank account details
     * 2. This function burns IDRX via burnWithAccountNumber(amount, hashedAccountNumber)
     * 3. Frontend gets transaction hash from burning
     * 4. Frontend calls IDRX API: POST /api/transaction/redeem-request
     * 5. IDRX.co processes fiat withdrawal to bank account
     * 
     * PARAMETERS for IDRX.burnWithAccountNumber():
     * - amount: _amount (IDRX amount to burn)
     * - accountNumber: _hashedAccountNumber (hash dari backend)
     * 
     * Note: User address (_user) is automatically determined by IDRX contract
     * 
     * @param _escrowId ID of escrow room
     * @param _amount Total amount of IDRX to withdraw to fiat (fee will be deducted from this amount)
     * @param _hashedAccountNumber Hashed bank account number generated by backend
     */
    function withdrawIDRXToFiat(
        bytes32 _escrowId,
        uint256 _amount,
        string memory _hashedAccountNumber
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        require(receiver.receiverAddress == msg.sender, "Not authorized receiver");
        require(receiver.isActive, "Receiver is not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= receiver.currentAllocation, "Amount exceeds current allocation");
        
        // Calculate fee from the total amount
        uint256 fee = (_amount * platformFeeBps) / 10000;
        
        // Calculate net amount (after fee deduction)
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        
        // STEP 1: Smart contract burns IDRX using IIDRX interface
        // This destroys the tokens and makes them available for fiat conversion
        // Backend provides hashedAccountNumber for IDRX.co processing
        IIDRX idrx = IIDRX(IDRX_ADDRESS);
        idrx.burnWithAccountNumber(
            netAmount,               // Burn net amount (after fee deduction)
            _hashedAccountNumber     // Hash from backend
        );
        
        // STEP 2: Frontend must now call IDRX API to complete fiat withdrawal
        // API endpoint: POST /api/transaction/redeem-request
        // Required params: txHash (from this transaction), amount, bank details
        // Note: IDRX.burnWithAccountNumber() called with net amount:
        // - amount: netAmount (amount after fee deduction)
        // - accountNumber: _hashedAccountNumber (hash from backend)
        // User address (_user) is automatically determined by IDRX contract
        
        // IMPORTANT: Burn netAmount so backend gets correct information
        // Fee is handled by reducing escrow balance (no separate transfer needed)
        // Events emitted (like mainnet):
        // 1. Transfer to 0x0000... (burn) - netAmount
        // 2. BurnWithAccountNumber - netAmount (correct for backend)
        
        // Transfer fee to platform (feeRecipient)
        if (fee > 0) {
            IERC20 idrxERC20 = IERC20(IDRX_ADDRESS);
            require(idrxERC20.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        
        // Note: Fee transfer doesn't add extra events to logs
        // Only 2 events from IDRX token burn (like mainnet)
        

    }
    

    

    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get escrow details with receiver addresses
     */
    function getEscrowDetails(bytes32 _escrowId) external view returns (
        address sender,
        uint256 totalAllocatedAmount,
        uint256 totalDepositedAmount,
        uint256 totalWithdrawnAmount,
        uint256 availableBalance,
        bool isActive,
        uint256 createdAt,
        uint256 lastTopUpAt,
        uint256 receiverCount,
        uint256 activeReceiverCount,
        address[] memory receiverAddresses
    ) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        return (
            room.sender,
            room.totalAllocatedAmount,
            room.totalDepositedAmount,
            room.totalWithdrawnAmount,
            room.availableBalance,
            room.isActive,
            room.createdAt,
            room.lastTopUpAt,
            room.receiverAddresses.length,
            room.activeReceiverCount,
            room.receiverAddresses
        );
    }
    
    /**
     * @dev Get receiver details
     */
    function getReceiverDetails(bytes32 _escrowId, address _receiver) external view returns (
        uint256 currentAllocation,
        uint256 withdrawnAmount,
        bool isActive
    ) {
        Receiver storage receiver = escrowRooms[_escrowId].receivers[_receiver];
        return (
            receiver.currentAllocation,
            receiver.withdrawnAmount,
            receiver.isActive
        );
    }
    
    /**
     * @dev Get withdrawable amount for receiver
     */
    function getWithdrawableAmount(bytes32 _escrowId, address _receiver) external view returns (uint256 withdrawableAmount) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        if (!receiver.isActive) {
            return 0;
        }
        return receiver.currentAllocation;
    }
    
    /**
     * @dev Get allocation for receiver (current amount)
     */
    function getAllocation(bytes32 _escrowId, address _receiver) external view returns (uint256 allocation) {
        Receiver storage receiver = escrowRooms[_escrowId].receivers[_receiver];
        return receiver.currentAllocation;
    }
    
    /**
     * @dev Get all receivers for an escrow
     */
    function getEscrowReceivers(bytes32 _escrowId) external view returns (address[] memory receivers) {
        return escrowRooms[_escrowId].receiverAddresses;
    }
    
    /**
     * @dev Get user's escrows (as sender)
     */
    function getUserEscrows(address _user) external view returns (bytes32[] memory escrowIds) {
        return userEscrows[_user];
    }
    
    /**
     * @dev Get receiver's escrows
     */
    function getReceiverEscrows(address _receiver) external view returns (bytes32[] memory escrowIds) {
        return receiverEscrows[_receiver];
    }
    
    /**
     * @dev Get escrow balance info
     */
    function getEscrowBalance(bytes32 _escrowId) external view returns (
        uint256 totalAllocated,
        uint256 availableBalance,
        uint256 totalDeposited,
        uint256 totalWithdrawn
    ) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        return (
            room.totalAllocatedAmount,
            room.availableBalance,
            room.totalDepositedAmount,
            room.totalWithdrawnAmount
        );
    }
    

}