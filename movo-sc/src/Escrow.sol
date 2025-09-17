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
 * @title Escrow
 * @dev Smart contract for token escrow system designed for long-term usage (USDC, USDT, etc.)
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
contract Escrow is ReentrancyGuard, Ownable, Pausable {
    
    // ============ STRUCTS ============
    
    struct Receiver {
        address receiverAddress;
        uint256 currentAllocation;    // Current allocation amount
        uint256 originalAllocation;   // Original allocation amount (from escrow creation)
        uint256 withdrawnAmount;      // Total amount withdrawn
        bool isActive;                // Receiver still active
    }
    
    struct EscrowRoom {
        address sender;
        address tokenAddress;            // Address of the token contract
        uint256 totalAllocatedAmount;     // Total amount allocated to all receivers
        uint256 totalDepositedAmount;     // Total amount deposited by sender
        uint256 totalWithdrawnAmount;     // Total amount withdrawn
        uint256 availableBalance;         // Available balance for withdrawals (only from topUpFunds)
        uint256 cycleBalance;             // Balance for current cycle (resets when all claimed)
        uint256 createdAt;
        uint256 lastTopUpAt;             // Last time funds were added
        mapping(address => Receiver) receivers;
        address[] receiverAddresses;
        uint256 activeReceiverCount;
        bool isActive;                   // Whether escrow is active (not closed)
        // Vesting fields
        uint256 vestingStartTime;        // When vesting starts (can be in the future)
        uint256 vestingDuration;         // Total vesting duration in seconds
        bool isVestingEnabled;           // Whether vesting is enabled for this escrow
    }
    
    // ============ STATE VARIABLES ============
    
    mapping(bytes32 => EscrowRoom) public escrowRooms;
    mapping(address => bytes32[]) public userEscrows; // Sender escrows
    mapping(address => bytes32[]) public receiverEscrows; // Receiver escrows
    
    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFeeBps = 25; // 0.25%
    address public feeRecipient = 0x63470E56eFeB1759F3560500fB2d2FD43A86F179;
    
    // Minimum and maximum amounts (6 decimals)
    
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
    

    
    event TokenWithdrawn(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount,
        address depositWallet
    );
    
    event TokenWithdrawnToFiat(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 amount,
        address depositWallet
    );
    
    
    event VestingConfigured(
        bytes32 indexed escrowId,
        uint256 vestingStartTime,
        uint256 vestingDuration,
        bool isVestingEnabled
    );
    
    event VestingClaimed(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 claimedAmount,
        uint256 remainingVestedAmount
    );
    
    event EscrowClosed(
        bytes32 indexed escrowId,
        address indexed sender,
        uint256 closedAt
    );
    
    event VestingCompleted(
        bytes32 indexed escrowId,
        address indexed receiver,
        uint256 totalVestedAmount,
        uint256 completedAt
    );
    
    event EscrowStatusChanged(
        bytes32 indexed escrowId,
        bool isActive,
        uint256 changedAt
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyEscrowSender(bytes32 _escrowId) {
        if (escrowRooms[_escrowId].sender != msg.sender) revert("Only escrow sender");
        _;
    }
    
    modifier escrowExists(bytes32 _escrowId) {
        if (escrowRooms[_escrowId].sender == address(0)) revert("Escrow does not exist");
        _;
    }
    
    modifier escrowActive(bytes32 _escrowId) {
        if (!escrowRooms[_escrowId].isActive) revert("Escrow is closed");
        _;
    }
    
    
    modifier receiverExists(bytes32 _escrowId, address _receiver) {
        if (escrowRooms[_escrowId].receivers[_receiver].receiverAddress == address(0)) revert("Receiver does not exist");
        _;
    }
    
    modifier receiverActive(bytes32 _escrowId, address _receiver) {
        if (!escrowRooms[_escrowId].receivers[_receiver].isActive) revert("Receiver is not active");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {
        // feeRecipient already set to default value
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Create new escrow room with multiple receivers
     * @param _tokenAddress Address of the token contract (USDC, USDT, etc.)
     * @param _receivers Array of receiver addresses
     * @param _amounts Array of amounts for each receiver
     * @param _vestingStartTime When vesting starts (0 = no vesting, >0 = vesting enabled)
     * @param _vestingDuration Vesting duration in seconds (0 = no vesting)
     * @return escrowId ID of the created escrow
     */
    function createEscrow(
        address _tokenAddress,
        address[] memory _receivers,
        uint256[] memory _amounts,
        uint256 _vestingStartTime,
        uint256 _vestingDuration
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (_tokenAddress == address(0)) revert("Invalid token address");
        if (_receivers.length == 0) revert("At least one receiver required");
        if (_receivers.length != _amounts.length) revert("Receivers and amounts length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        // Amount validation: must be greater than 0
        if (totalAmount == 0) revert("Total amount must be greater than 0");
        
        // Validate vesting parameters - VESTING IS OPTIONAL
        bool isVestingEnabled = false;
        uint256 finalVestingStartTime = _vestingStartTime;
        uint256 finalVestingDuration = _vestingDuration;
        
        if (_vestingDuration > 0) {
            // If vesting duration is provided, enable vesting
            isVestingEnabled = true;
            
            // If no custom start time provided, start vesting immediately
            if (_vestingStartTime == 0) {
                finalVestingStartTime = block.timestamp;
            } else {
                // Custom start time provided, validate it
                if (_vestingStartTime > block.timestamp + 365 * 24 * 60 * 60) {
                    revert("Vesting start time too far in the future");
                }
            }
            
            // Validate vesting duration
            if (_vestingDuration > 10 * 365 * 24 * 60 * 60) {
                revert("Vesting duration too long");
            }
        } else if (_vestingStartTime > 0) {
            // If only start time provided without duration, revert
            revert("Vesting duration must be provided if start time is set");
        }
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                _tokenAddress,
                totalAmount,
                block.timestamp,
                block.number
            )
        );
        
        EscrowRoom storage room = escrowRooms[escrowId];
        room.sender = msg.sender;
        room.tokenAddress = _tokenAddress;
        room.totalAllocatedAmount = totalAmount;
        room.availableBalance = 0;  // Start from 0, no funds in escrow
        room.createdAt = block.timestamp;
        room.lastTopUpAt = block.timestamp;
        room.activeReceiverCount = _receivers.length;
        room.isActive = true;  // Escrow starts as active
        room.vestingStartTime = finalVestingStartTime;
        room.vestingDuration = finalVestingDuration;
        room.isVestingEnabled = isVestingEnabled;
        
        // Add receivers
        for (uint256 i = 0; i < _receivers.length; i++) {
            if (_receivers[i] == address(0)) revert("Invalid receiver address");
            if (_amounts[i] == 0) revert("Amount must be greater than 0");
            
            room.receivers[_receivers[i]] = Receiver({
                receiverAddress: _receivers[i],
                currentAllocation: _amounts[i],
                originalAllocation: _amounts[i],
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
        
        // Emit escrow status change event
        emit EscrowStatusChanged(escrowId, true, block.timestamp);
        
        // Emit vesting configuration event - VESTING IS MANDATORY
        emit VestingConfigured(
            escrowId,
            _vestingStartTime,
            _vestingDuration,
            isVestingEnabled
        );
        
        return escrowId;
    }
    
    /**
     * @dev Calculate vested amount for a receiver at current time
     * @param _escrowId ID of escrow room
     * @param _receiver Address of the receiver
     * @return vestedAmount Amount that has vested and can be claimed
     * @return totalVestedAmount Total amount that will be vested
     */
    function calculateVestedAmount(
        bytes32 _escrowId,
        address _receiver
    ) public view returns (uint256 vestedAmount, uint256 totalVestedAmount) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        // If no vesting (immediate claim), all is vested
        if (!room.isVestingEnabled) {
            return (receiver.currentAllocation, receiver.currentAllocation);
        }
        
        uint256 currentTime = block.timestamp;
        
        // If vesting hasn't started yet, nothing is vested
        if (currentTime < room.vestingStartTime) {
            return (0, receiver.currentAllocation);
        }
        
        // If vesting period is complete, all is vested
        uint256 vestingEndTime = room.vestingStartTime + room.vestingDuration;
        if (currentTime >= vestingEndTime) {
            return (receiver.currentAllocation, receiver.currentAllocation);
        }
        
        // Calculate linear vesting
        uint256 timeElapsed = currentTime - room.vestingStartTime;
        uint256 vestingProgress = (timeElapsed * 1e18) / room.vestingDuration; // Use 1e18 for precision
        
        // Calculate vested amount with precision
        uint256 vestedAmountPrecise = (receiver.currentAllocation * vestingProgress) / 1e18;
        
        return (vestedAmountPrecise, receiver.currentAllocation);
    }
    
    /**
     * @dev Top-up funds to existing escrow - flexible amount
     * @param _escrowId ID of escrow room
     * @param _amount Amount of USDC to add (can be any amount, not limited to total allocation)
     */
    function topUpFunds(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        if (_amount == 0) revert("Amount must be greater than 0");
        if (_amount == 0) revert("Amount must be greater than 0");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Transfer token to escrow
        IERC20 token = IERC20(room.tokenAddress);
        if (!token.transferFrom(msg.sender, address(this), _amount)) revert("Transfer to escrow failed");
        
        room.totalDepositedAmount += _amount;
        room.availableBalance += _amount;  // Dynamic balance - increases with each topup
        room.lastTopUpAt = block.timestamp;
        
        // Check if this is the first topup (initial funding) or subsequent topup
        bool isFirstTopup = (room.totalDepositedAmount == _amount);
        
        if (!isFirstTopup) {
            // This is a subsequent topup - check if all tokens from current cycle have been claimed
            // We need to check if the total withdrawn amount equals the total allocated amount
            // This means all tokens from the current cycle have been claimed
            bool allTokensClaimed = (room.totalWithdrawnAmount >= room.totalAllocatedAmount);
            
            if (allTokensClaimed) {
                // All tokens have been claimed - reset receiver withdrawn amounts for new cycle
                // but keep the same allocations
                for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
                    address receiverAddress = room.receiverAddresses[i];
                    Receiver storage receiver = room.receivers[receiverAddress];
                    
                    if (receiver.isActive) {
                        // Reset withdrawn amount for new cycle, keep same allocation
                        receiver.withdrawnAmount = 0;
                    }
                }
                
                // Reset total withdrawn amount for new cycle
                room.totalWithdrawnAmount = 0;
                
                // Set new cycle balance
                room.cycleBalance = _amount;
            } else {
                // Not all tokens claimed - auto-update receiver allocations proportionally
                uint256 totalOriginalAllocation = 0;
                uint256 activeReceiverCount = 0;
                
                // First, calculate total original allocation of active receivers
                for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
                    address receiverAddress = room.receiverAddresses[i];
                    Receiver storage receiver = room.receivers[receiverAddress];
                    
                    if (receiver.isActive) {
                        totalOriginalAllocation += receiver.originalAllocation;
                        activeReceiverCount++;
                    }
                }
                
                if (activeReceiverCount > 0 && totalOriginalAllocation > 0) {
                    // Distribute topup amount proportionally based on original allocation
                    for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
                        address receiverAddress = room.receiverAddresses[i];
                        Receiver storage receiver = room.receivers[receiverAddress];
                        
                        if (receiver.isActive) {
                            // Calculate proportional amount based on original allocation
                            uint256 proportionalAmount = (_amount * receiver.originalAllocation) / totalOriginalAllocation;
                            
                            uint256 oldAllocation = receiver.currentAllocation;
                            receiver.currentAllocation += proportionalAmount;
                            room.totalAllocatedAmount += proportionalAmount;
                            
                            emit ReceiverAmountUpdated(_escrowId, receiverAddress, oldAllocation, receiver.currentAllocation);
                        }
                    }
                }
                
                // Update cycle balance for proportional distribution
                room.cycleBalance += _amount;
            }
        } else {
            // First topup - set initial cycle balance
            room.cycleBalance = _amount;
        }
        
        emit FundsTopUp(_escrowId, msg.sender, _amount, room.availableBalance);
    }
    
    /**
     * @dev Top-up funds with new vesting schedule and updated receiver amounts
     * @param _escrowId ID of escrow room
     * @param _amount Total amount to topup
     * @param _newVestingStartTime New vesting start time
     * @param _newVestingDuration New vesting duration
     * @param _receiverAmounts New amounts for each receiver (must match existing receivers)
     */
    function topUpWithNewVesting(
        bytes32 _escrowId,
        uint256 _amount,
        uint256 _newVestingStartTime,
        uint256 _newVestingDuration,
        uint256[] memory _receiverAmounts
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        if (_amount == 0) revert("Amount must be greater than 0");
        if (_amount == 0) revert("Amount must be greater than 0");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Validate receiver amounts array
        if (_receiverAmounts.length != room.receiverAddresses.length) {
            revert("Receiver amounts array length mismatch");
        }
        
        // Validate new vesting parameters
        if (_newVestingStartTime == 0 || _newVestingDuration == 0) {
            revert("New vesting start time and duration must be provided");
        }
        if (_newVestingStartTime > block.timestamp + 365 * 24 * 60 * 60) {
            revert("New vesting start time too far in the future");
        }
        if (_newVestingDuration > 10 * 365 * 24 * 60 * 60) {
            revert("New vesting duration too long");
        }
        
        // Calculate total new allocation
        uint256 totalNewAllocation = 0;
        for (uint256 i = 0; i < _receiverAmounts.length; i++) {
            if (_receiverAmounts[i] == 0) revert("Receiver amount must be greater than 0");
            totalNewAllocation += _receiverAmounts[i];
        }
        
        if (totalNewAllocation != _amount) {
            revert("Total receiver amounts must equal topup amount");
        }
        
        // Transfer token to escrow
        IERC20 token = IERC20(room.tokenAddress);
        if (!token.transferFrom(msg.sender, address(this), _amount)) revert("Transfer to escrow failed");
        
        room.totalDepositedAmount += _amount;
        room.availableBalance += _amount;
        room.lastTopUpAt = block.timestamp;
        
        // Update vesting schedule
        room.vestingStartTime = _newVestingStartTime;
        room.vestingDuration = _newVestingDuration;
        room.isVestingEnabled = true;
        
        // Update receiver allocations
        for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
            address receiverAddress = room.receiverAddresses[i];
            Receiver storage receiver = room.receivers[receiverAddress];
            
            if (receiver.isActive) {
                uint256 oldAllocation = receiver.currentAllocation;
                receiver.currentAllocation = _receiverAmounts[i];
                receiver.originalAllocation = _receiverAmounts[i];
                receiver.withdrawnAmount = 0; // Reset withdrawn amount for new vesting cycle
                
                emit ReceiverAmountUpdated(_escrowId, receiverAddress, oldAllocation, receiver.currentAllocation);
            }
        }
        
        // Update total allocated amount
        room.totalAllocatedAmount = totalNewAllocation;
        
        emit FundsTopUp(_escrowId, msg.sender, _amount, room.availableBalance);
        emit VestingConfigured(_escrowId, _newVestingStartTime, _newVestingDuration, true);
    }
    
    /**
     * @dev Add new receiver to existing escrow
     * @param _escrowId ID of escrow room
     * @param _receiver Address of new receiver
     * @param _amount Amount for new receiver
     * 
     * VALIDATION: Can only add receiver if:
     * - Available balance is less than 1 token (1 * 10^6), OR
     * - All tokens have been claimed (totalWithdrawnAmount = totalDepositedAmount), OR
     * - No vesting enabled, OR
     * - Vesting has completed
     */
    function addReceiver(
        bytes32 _escrowId,
        address _receiver,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        if (_receiver == address(0)) revert("Invalid receiver address");
        if (_amount == 0) revert("Amount must be greater than 0");
        if (escrowRooms[_escrowId].receivers[_receiver].receiverAddress != address(0)) revert("Receiver already exists");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Validation: Can only add receiver if:
        // 1. Available balance is less than 1 token (1 * 10^6), OR
        // 2. All tokens have been claimed (totalWithdrawnAmount = totalDepositedAmount), OR
        // 3. No vesting enabled, OR
        // 4. Vesting has completed
        bool canAddReceiver = false;
        
        // Check if available balance is less than 1 token (1 * 10^6 for USDC/USDT)
        if (room.availableBalance < 1 * 10**6) {
            canAddReceiver = true;
        }
        // Check if all tokens have been claimed
        else if (room.totalDepositedAmount > 0 && room.totalWithdrawnAmount >= room.totalDepositedAmount) {
            canAddReceiver = true;
        }
        // Check if no vesting enabled
        else if (!room.isVestingEnabled) {
            canAddReceiver = true;
        }
        // Check if vesting has completed
        else if (room.isVestingEnabled && block.timestamp >= room.vestingStartTime + room.vestingDuration) {
            canAddReceiver = true;
        }
        
        if (!canAddReceiver) {
            revert("Cannot add receiver: escrow has significant unclaimed tokens and vesting is still active");
        }
        
        // Add receiver without balance check
        room.receivers[_receiver] = Receiver({
            receiverAddress: _receiver,
            currentAllocation: _amount,
            originalAllocation: _amount,
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
        
        if (receiver.receiverAddress == address(0)) revert("Receiver does not exist");
        if (!receiver.isActive) revert("Receiver already inactive");
        
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
        if (_newAmount == 0) revert("Amount must be greater than 0");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        if (receiver.receiverAddress == address(0)) revert("Receiver does not exist");
        if (!receiver.isActive) revert("Receiver is not active");
        
        uint256 oldAmount = receiver.currentAllocation;
        
        // Update amount without balance check
        room.totalAllocatedAmount = room.totalAllocatedAmount - oldAmount + _newAmount;
        receiver.currentAllocation = _newAmount;
        
        emit ReceiverAmountUpdated(_escrowId, _receiver, oldAmount, _newAmount);
    }
    
    /**
     * @dev Withdraw token to crypto wallet (receiver's own wallet)
     * @param _escrowId ID of escrow room
     * @param _amount Amount of token to withdraw
     */
    function withdrawTokenToCrypto(
        bytes32 _escrowId,
        uint256 _amount
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        if (receiver.receiverAddress != msg.sender) revert("Not authorized receiver");
        if (!receiver.isActive) revert("Receiver is not active");
        if (_amount == 0) revert("Amount must be greater than 0");
        if (_amount < 3 * 10**6) revert("Minimum withdrawal amount is 3 USDT");
        
        // Check vesting - VESTING IS MANDATORY
        (uint256 vestedAmount,) = calculateVestedAmount(_escrowId, msg.sender);
        uint256 availableAmount = vestedAmount - receiver.withdrawnAmount;
        if (_amount > availableAmount) revert("Amount exceeds vested amount");
        
        // Check if escrow has enough available balance
        if (_amount > room.availableBalance) revert("Insufficient escrow balance");
        
        uint256 fee = (_amount * platformFeeBps) / 10000;
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        room.cycleBalance -= _amount;
        
        IERC20 token = IERC20(room.tokenAddress);
        
        // Transfer token to receiver's own wallet
        if (!token.transfer(msg.sender, netAmount)) revert("Transfer to crypto wallet failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            if (!token.transfer(feeRecipient, fee)) revert("Fee transfer failed");
        }
        
        // Check if vesting is completed for this receiver
        if (room.vestingDuration > 0) {
            uint256 currentTime = block.timestamp;
            uint256 vestingEndTime = room.vestingStartTime + room.vestingDuration;
            
            if (currentTime >= vestingEndTime && receiver.withdrawnAmount >= receiver.currentAllocation) {
                emit VestingCompleted(_escrowId, msg.sender, receiver.currentAllocation, currentTime);
            }
        }
        
        emit TokenWithdrawn(_escrowId, msg.sender, _amount, msg.sender);
    }
    
    /**
     * @dev Withdraw token to fiat (send to deposit wallet provided by frontend)
     * @param _escrowId ID of escrow room
     * @param _amount Amount of token to withdraw to fiat
     * @param _depositWallet Deposit wallet address provided by frontend
     */
    function withdrawTokenToFiat(
        bytes32 _escrowId,
        uint256 _amount,
        address _depositWallet
    ) external nonReentrant whenNotPaused escrowExists(_escrowId) {
        if (_depositWallet == address(0)) revert("Invalid deposit wallet address");
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[msg.sender];
        
        if (receiver.receiverAddress != msg.sender) revert("Not authorized receiver");
        if (!receiver.isActive) revert("Receiver is not active");
        if (_amount == 0) revert("Amount must be greater than 0");
        if (_amount < 3 * 10**6) revert("Minimum withdrawal amount is 3 USDT");
        
        // Check vesting - VESTING IS MANDATORY
        (uint256 vestedAmount,) = calculateVestedAmount(_escrowId, msg.sender);
        uint256 availableAmount = vestedAmount - receiver.withdrawnAmount;
        if (_amount > availableAmount) revert("Amount exceeds vested amount");
        
        // Check if escrow has enough available balance
        if (_amount > room.availableBalance) revert("Insufficient escrow balance");
        
        uint256 fee = (_amount * platformFeeBps) / 10000;
        uint256 netAmount = _amount - fee;
        
        receiver.withdrawnAmount += _amount;
        room.totalWithdrawnAmount += _amount;
        room.availableBalance -= _amount;
        room.cycleBalance -= _amount;
        
        IERC20 token = IERC20(room.tokenAddress);
        
        // Transfer token to deposit wallet for fiat processing
        if (!token.transfer(_depositWallet, netAmount)) revert("Transfer to fiat deposit wallet failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            if (!token.transfer(feeRecipient, fee)) revert("Fee transfer failed");
        }
        
        // Check if vesting is completed for this receiver
        if (room.vestingDuration > 0) {
            uint256 currentTime = block.timestamp;
            uint256 vestingEndTime = room.vestingStartTime + room.vestingDuration;
            
            if (currentTime >= vestingEndTime && receiver.withdrawnAmount >= receiver.currentAllocation) {
                emit VestingCompleted(_escrowId, msg.sender, receiver.currentAllocation, currentTime);
            }
        }
        
        emit TokenWithdrawnToFiat(_escrowId, msg.sender, _amount, _depositWallet);
    }
    
    
    /**
     * @dev Close escrow permanently and refund remaining balance to sender
     * @param _escrowId ID of escrow room
     */
    function closeEscrow(
        bytes32 _escrowId
    ) external nonReentrant escrowExists(_escrowId) escrowActive(_escrowId) onlyEscrowSender(_escrowId) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        
        // Validation: Cannot close escrow if there is any balance
        if (room.availableBalance > 0) {
            revert("Cannot close escrow with remaining balance. Please withdraw all funds first.");
        }
        
        // Validation: Cannot close escrow if there are active receivers with unclaimed amounts AND there are funds available
        // If availableBalance = 0, then there are no funds to claim, so it's safe to close
        if (room.availableBalance > 0) {
            for (uint256 i = 0; i < room.receiverAddresses.length; i++) {
                address receiver = room.receiverAddresses[i];
                Receiver storage receiverData = room.receivers[receiver];
                
                if (receiverData.isActive) {
                    uint256 unclaimedAmount = receiverData.currentAllocation - receiverData.withdrawnAmount;
                    if (unclaimedAmount > 0) {
                        revert("Cannot close escrow with unclaimed amounts. All receivers must claim their allocations first.");
                    }
                }
            }
        }
        
        // Mark escrow as inactive
        room.isActive = false;
        
        // Emit events for frontend to listen
        emit EscrowStatusChanged(_escrowId, false, block.timestamp);
        emit EscrowClosed(_escrowId, room.sender, block.timestamp);
  }
    
    /**
     * @dev Check if escrow is still active
     * @param _escrowId ID of escrow room
     * @return isActive Whether escrow is active
     */
    function isEscrowActive(bytes32 _escrowId) external view returns (bool) {
        return escrowRooms[_escrowId].isActive;
    }
    
    /**
     * @dev Get all active escrows for a sender
     * @param _sender Address of the sender
     * @return activeEscrows Array of active escrow IDs
     */
    function getActiveEscrowsForSender(address _sender) external view returns (bytes32[] memory) {
        bytes32[] memory allEscrows = userEscrows[_sender];
        uint256 activeCount = 0;
        
        // Count active escrows
        for (uint256 i = 0; i < allEscrows.length; i++) {
            if (escrowRooms[allEscrows[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array with active escrows only
        bytes32[] memory activeEscrows = new bytes32[](activeCount);
        uint256 activeIndex = 0;
        
        for (uint256 i = 0; i < allEscrows.length; i++) {
            if (escrowRooms[allEscrows[i]].isActive) {
                activeEscrows[activeIndex] = allEscrows[i];
                activeIndex++;
            }
        }
        
        return activeEscrows;
    }
    
    /**
     * @dev Get all active escrows for a receiver
     * @param _receiver Address of the receiver
     * @return activeEscrows Array of active escrow IDs where receiver is involved
     */
    function getActiveEscrowsForReceiver(address _receiver) external view returns (bytes32[] memory) {
        bytes32[] memory allEscrows = receiverEscrows[_receiver];
        uint256 activeCount = 0;
        
        // Count active escrows
        for (uint256 i = 0; i < allEscrows.length; i++) {
            if (escrowRooms[allEscrows[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array with active escrows only
        bytes32[] memory activeEscrows = new bytes32[](activeCount);
        uint256 activeIndex = 0;
        
        for (uint256 i = 0; i < allEscrows.length; i++) {
            if (escrowRooms[allEscrows[i]].isActive) {
                activeEscrows[activeIndex] = allEscrows[i];
                activeIndex++;
            }
        }
        
        return activeEscrows;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get escrow details with receiver addresses
     */
    function getEscrowDetails(bytes32 _escrowId) external view returns (
        address sender,
        address tokenAddress,
        uint256 totalAllocatedAmount,
        uint256 totalDepositedAmount,
        uint256 totalWithdrawnAmount,
        uint256 availableBalance,
        uint256 createdAt,
        uint256 lastTopUpAt,
        uint256 receiverCount,
        uint256 activeReceiverCount,
        address[] memory receiverAddresses
    ) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        return (
            room.sender,
            room.tokenAddress,
            room.totalAllocatedAmount,
            room.totalDepositedAmount,
            room.totalWithdrawnAmount,
            room.availableBalance,
            room.createdAt,
            room.lastTopUpAt,
            room.receiverAddresses.length,
            room.activeReceiverCount,
            room.receiverAddresses
        );
    }
    
    function getCycleBalance(bytes32 _escrowId) external view returns (uint256) {
        return escrowRooms[_escrowId].cycleBalance;
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
     * @dev Get vesting information for an escrow
     */
    function getVestingInfo(bytes32 _escrowId) external view returns (
        bool isVestingEnabled,
        uint256 vestingStartTime,
        uint256 vestingDuration,
        uint256 vestingEndTime,
        uint256 currentTime
    ) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        uint256 endTime = room.vestingStartTime + room.vestingDuration;
        
        return (
            room.isVestingEnabled,
            room.vestingStartTime,
            room.vestingDuration,
            endTime,
            block.timestamp
        );
    }
    
    /**
     * @dev Get vesting information for a specific receiver
     */
    function getReceiverVestingInfo(bytes32 _escrowId, address _receiver) external view returns (
        uint256 vestedAmount,
        uint256 totalVestedAmount,
        uint256 availableToClaim,
        uint256 vestingProgress
    ) {
        (uint256 vested, uint256 total) = calculateVestedAmount(_escrowId, _receiver);
        Receiver storage receiver = escrowRooms[_escrowId].receivers[_receiver];
        uint256 available = vested - receiver.withdrawnAmount;
        
        EscrowRoom storage room = escrowRooms[_escrowId];
        uint256 progress = 0;
        
        // If no vesting, progress is 100%
        if (!room.isVestingEnabled) {
            progress = 10000; // 100% (using basis points)
        } else {
            uint256 currentTime = block.timestamp;
            if (currentTime >= room.vestingStartTime) {
                uint256 timeElapsed = currentTime - room.vestingStartTime;
                if (timeElapsed >= room.vestingDuration) {
                    progress = 10000; // 100% (using basis points)
                } else {
                    progress = (timeElapsed * 10000) / room.vestingDuration;
                }
            }
        }
        
        return (vested, total, available, progress);
    }
    
    /**
     * @dev Get withdrawable amount for receiver (considering vesting and available balance)
     */
    function getWithdrawableAmount(bytes32 _escrowId, address _receiver) external view returns (uint256 withdrawableAmount) {
        EscrowRoom storage room = escrowRooms[_escrowId];
        Receiver storage receiver = room.receivers[_receiver];
        
        if (!receiver.isActive) {
            return 0;
        }
        
        // Calculate vested amount
        (uint256 vestedAmount,) = calculateVestedAmount(_escrowId, _receiver);
        uint256 availableToClaim = vestedAmount - receiver.withdrawnAmount;
        
        // Return the minimum between available to claim and escrow available balance
        return availableToClaim < room.availableBalance ? availableToClaim : room.availableBalance;
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
}