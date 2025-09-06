// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██║░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

/**
 * @title EscrowUSDC
 * @dev Smart contract for USDC escrow system designed for long-term usage
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
 * - January: 5 receivers, 200 USDC each, total 1000 USDC
 * - February: Same 5 receivers, same amounts, top-up 1000 USDC
 * - March: Increase each receiver by 100 USDC (300 USDC each), top-up 1500 USDC
 * - Receiver can withdraw anytime according to allocation (no cycle restrictions)
 */
contract EscrowUSDC is ReentrancyGuard, Ownable, Pausable {
    
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
    
    // USDC contract address
    address public constant USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC Base testnet
    
    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFeeBps = 25; // 0.25%
    address public feeRecipient = 0x63470E56eFeB1759F3560500fB2d2FD43A86F179;
    
    // Minimum and maximum amounts (6 decimals)
    uint256 public minEscrowAmount = 2 * 10**6; // 2 USDC
    uint256 public maxEscrowAmount = 1000000 * 10**6; // 1M USDC
    
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
        uint256 newCycleBalance
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
    

    
    event USDCWithdrawn(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount,
        address depositWallet
    );
    
    event USDCWithdrawnToFiat(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount,
        address depositWallet
    );
    
    event EscrowPaused(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 remainingBalance
    );
    
    event EscrowResumed(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 cycleBalance
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
        require(totalAmount >= minEscrowAmount, "Amount below minimum (2 USDC)");
        require(totalAmount <= maxEscrowAmount, "Amount above maximum (1M USDC)");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                USDC_ADDRESS,
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
     * @dev Top-up funds to existing escrow for new payment cycle
     * @param _escrowId ID of escrow room
     * @param _amount Amount of USDC to add
     */
    function topUpFunds(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= maxEscrowAmount, "Amount above maximum (1M USDC)");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Transfer USDC to escrow
        IERC20 usdc = IERC20(USDC_ADDRESS);
        require(usdc.transferFrom(msg.sender, address(this), _amount), "Transfer to escrow failed");
        
        room.totalDepositedAmount += _amount;
        room.availableBalance += _amount;  // Balance available for withdrawal
        room.lastTopUpAt = block.timestamp;
        
        emit FundsTopUp(_escrowId, msg.sender, _amount, room.availableBalance);
    }
    

    
    /**
     * @dev Add new receiver to existing escrow - freely add receiver without balance requirement
     * @param _escrowId ID of escrow room
     * @param _receiver Address of new receiver
     * @param _amount Amount for new receiver (2-5000 USDC)
     */
    function addReceiver(
        bytes32 _escrowId,
        address _receiver,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        require(_receiver != address(0), "Invalid receiver address");
        // Amount validation: minimum 2 USDC, maximum 5000 USDC
        require(_amount >= 2 * 10**6, "Amount below minimum (2 USDC)");
        require(_amount <= 5000 * 10**6, "Amount above maximum (5000 USDC)");
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
     * @param _newAmount New amount for receiver (2-5000 USDC)
     */
    function updateReceiverAmount(
        bytes32 _escrowId,
        address _receiver,
        uint256 _newAmount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        // Amount validation: minimum 2 USDC, maximum 5000 USDC
        require(_newAmount >= 2 * 10**6, "Amount below minimum (2 USDC)");
        require(_newAmount <= 5000 * 10**6, "Amount above maximum (5000 USDC)");
        
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
     * @dev Withdraw USDC to crypto wallet (receiver's own wallet)
     * @param _escrowId ID of escrow room
     * @param _amount Amount of USDC to withdraw
     */
    function withdrawUSDCToCrypto(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        require(receiver.receiverAddress == msg.sender, "Not authorized receiver");
        require(receiver.isActive, "Receiver is not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= receiver.currentAllocation, "Amount exceeds current allocation");
        
        uint256 fee = (_amount * platformFeeBps) / 10000;
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        
        IERC20 usdc = IERC20(USDC_ADDRESS);
        
        // Transfer USDC to receiver's own wallet
        require(usdc.transfer(msg.sender, netAmount), "Transfer to crypto wallet failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            require(usdc.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        
        emit USDCWithdrawn(_escrowId, msg.sender, _amount, msg.sender);
    }
    
    /**
     * @dev Withdraw USDC to fiat (send to deposit wallet provided by frontend)
     * @param _escrowId ID of escrow room
     * @param _amount Amount of USDC to withdraw to fiat
     * @param _depositWallet Deposit wallet address provided by frontend
     */
    function withdrawUSDCTofiat(
        bytes32 _escrowId,
        uint256 _amount,
        address _depositWallet
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) {
        require(_depositWallet != address(0), "Invalid deposit wallet address");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        require(receiver.receiverAddress == msg.sender, "Not authorized receiver");
        require(receiver.isActive, "Receiver is not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= receiver.currentAllocation, "Amount exceeds current allocation");
        
        uint256 fee = (_amount * platformFeeBps) / 10000;
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        
        IERC20 usdc = IERC20(USDC_ADDRESS);
        
        // Transfer USDC to deposit wallet for fiat processing
        require(usdc.transfer(_depositWallet, netAmount), "Transfer to fiat deposit wallet failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            require(usdc.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        
        emit USDCWithdrawnToFiat(_escrowId, msg.sender, _amount, _depositWallet);
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
            IERC20 usdc = IERC20(USDC_ADDRESS);
            require(usdc.transfer(room.sender, remainingBalance), "Refund transfer failed");
        }
        
        emit EscrowPaused(_escrowId, msg.sender, remainingBalance);
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