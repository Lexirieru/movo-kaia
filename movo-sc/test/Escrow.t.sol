// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

/*
███╗░░░███╗░█████╗░██╗░░░██║░█████╗░
████╗░████║██╔══██╗██║░░░██║██╔══██╗
██╔████╔██║██║░░██║╚██╗░██╔╝██║░░██║
██║╚██╔╝██║██║░░██║░╚████╔╝░██║░░██║
██║░╚═╝░██║╚█████╔╝░░╚██╔╝░░╚█████╔╝
╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░░╚════╝░
*/

contract EscrowTest is Test {
    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public feeRecipient = makeAddr("feeRecipient");
    address public fiatDepositWallet = makeAddr("fiatDepositWallet");

    Escrow public escrowContract;
    MockUSDC public mockUSDC;
    MockUSDT public mockUSDT;

    // Test constants
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**6; // 1M USDC/USDT with 6 decimals
    uint256 public constant PLATFORM_FEE_BPS = 25; // 0.25%

    function setUp() public {
        // Deploy MockUSDC token
        mockUSDC = new MockUSDC();
        
        // Deploy MockUSDT token
        mockUSDT = new MockUSDT();
        
        // Deploy Escrow contract
        escrowContract = new Escrow();
        
        // Setup token balances for testing
        deal(address(mockUSDC), owner, INITIAL_BALANCE);
        deal(address(mockUSDC), alice, INITIAL_BALANCE);
        deal(address(mockUSDC), bob, INITIAL_BALANCE);
        deal(address(mockUSDC), charlie, INITIAL_BALANCE);
        
        deal(address(mockUSDT), owner, INITIAL_BALANCE);
        deal(address(mockUSDT), alice, INITIAL_BALANCE);
        deal(address(mockUSDT), bob, INITIAL_BALANCE);
        deal(address(mockUSDT), charlie, INITIAL_BALANCE);
        
        // Give ETH for gas
        vm.deal(owner, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ============ HELPER FUNCTIONS ============

    function createTestEscrow(
        address tokenAddress,
        address[] memory receivers,
        uint256[] memory amounts,
        uint256 vestingStartTime,
        uint256 vestingDuration
    ) internal returns (bytes32) {
        vm.startPrank(owner);
        
        // Approve escrow to spend tokens
        IERC20(tokenAddress).approve(address(escrowContract), 1000000 * 10**6);
        
        bytes32 escrowId = escrowContract.createEscrow(
            tokenAddress,
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        vm.stopPrank();
        return escrowId;
    }

    function topUpEscrow(address tokenAddress, bytes32 escrowId, uint256 amount) internal {
        vm.startPrank(owner);
        IERC20(tokenAddress).approve(address(escrowContract), amount);
        escrowContract.topUpFunds(escrowId, amount);
        vm.stopPrank();
    }

    // ============ ESCROW CREATION TESTS ============

    function test_createEscrow_1Receiver_NoVesting() public {
        console.log("=== Test: Create Escrow - 1 Receiver, No Vesting (USDT) ===");
        
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Verify escrow was created
        assertTrue(escrowId != bytes32(0), "Escrow ID should not be zero");
        
        // Check escrow details
        (
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
        ) = escrowContract.getEscrowDetails(escrowId);
        
        assertEq(sender, owner, "Sender should be owner");
        assertEq(tokenAddress, address(mockUSDT), "Token address should be USDT");
        assertEq(totalAllocatedAmount, 1000 * 10**6, "Total allocated should be 1000 USDT");
        assertEq(totalDepositedAmount, 0, "No funds deposited yet");
        assertEq(availableBalance, 0, "No available balance yet");
        assertEq(receiverCount, 1, "Should have 1 receiver");
        assertEq(activeReceiverCount, 1, "Should have 1 active receiver");
        assertEq(receiverAddresses[0], alice, "Receiver should be alice");
        
        // Log escrow details
        console.log("=== Escrow Details ===");
        console.log("Escrow ID:", vm.toString(escrowId));
        console.log("Sender:", sender);
        console.log("Token Address:", tokenAddress);
        console.log("Total Allocated Amount:", totalAllocatedAmount);
        console.log("Total Deposited Amount:", totalDepositedAmount);
        console.log("Total Withdrawn Amount:", totalWithdrawnAmount);
        console.log("Available Balance:", availableBalance);
        console.log("Created At:", createdAt);
        console.log("Last Top Up At:", lastTopUpAt);
        console.log("Receiver Count:", receiverCount);
        console.log("Active Receiver Count:", activeReceiverCount);
        console.log("Receiver Addresses:");
        for (uint256 i = 0; i < receiverAddresses.length; i++) {
            console.log("  [%d]: %s", i, receiverAddresses[i]);
        }
        
        // Check vesting info (should be disabled)
        (
            bool isVestingEnabled,
            uint256 vestingStart,
            uint256 vestingDurationResult,
            uint256 vestingEndTime,
            uint256 currentTime
        ) = escrowContract.getVestingInfo(escrowId);
        
        assertFalse(isVestingEnabled, "Vesting should be disabled");
        
        // Log vesting info
        console.log("=== Vesting Info ===");
        console.log("Is Vesting Enabled:", isVestingEnabled);
        console.log("Vesting Start:", vestingStart);
        console.log("Vesting Duration:", vestingDurationResult);
        console.log("Vesting End Time:", vestingEndTime);
        console.log("Current Time:", currentTime);
        
        console.log("USDT Escrow created successfully with ID:", vm.toString(escrowId));
    }

    function test_createEscrow_2Receivers_NoVesting() public {
        console.log("=== Test: Create Escrow - 2 Receivers, No Vesting (USDT) ===");
        
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 2000 * 10**6; // 2000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Verify escrow was created
        assertTrue(escrowId != bytes32(0), "Escrow ID should not be zero");
        
        // Check escrow details
        (
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
        ) = escrowContract.getEscrowDetails(escrowId);
        
        assertEq(sender, owner, "Sender should be owner");
        assertEq(tokenAddress, address(mockUSDT), "Token address should be USDT");
        assertEq(totalAllocatedAmount, 3000 * 10**6, "Total allocated should be 3000 USDT");
        assertEq(totalDepositedAmount, 0, "No funds deposited yet");
        assertEq(availableBalance, 0, "No available balance yet");
        assertEq(receiverCount, 2, "Should have 2 receivers");
        assertEq(activeReceiverCount, 2, "Should have 2 active receivers");
        assertEq(receiverAddresses[0], alice, "First receiver should be alice");
        assertEq(receiverAddresses[1], bob, "Second receiver should be bob");
        
        // Log escrow details
        console.log("=== Escrow Details ===");
        console.log("Escrow ID:", vm.toString(escrowId));
        console.log("Sender:", sender);
        console.log("Token Address:", tokenAddress);
        console.log("Total Allocated Amount:", totalAllocatedAmount);
        console.log("Total Deposited Amount:", totalDepositedAmount);
        console.log("Total Withdrawn Amount:", totalWithdrawnAmount);
        console.log("Available Balance:", availableBalance);
        console.log("Created At:", createdAt);
        console.log("Last Top Up At:", lastTopUpAt);
        console.log("Receiver Count:", receiverCount);
        console.log("Active Receiver Count:", activeReceiverCount);
        console.log("Receiver Addresses:");
        for (uint256 i = 0; i < receiverAddresses.length; i++) {
            console.log("  [%d]: %s", i, receiverAddresses[i]);
        }
        
        // Check vesting info (should be disabled)
        (
            bool isVestingEnabled,
            uint256 vestingStart,
            uint256 vestingDurationResult,
            uint256 vestingEndTime,
            uint256 currentTime
        ) = escrowContract.getVestingInfo(escrowId);
        
        assertFalse(isVestingEnabled, "Vesting should be disabled");
        
        // Log vesting info
        console.log("=== Vesting Info ===");
        console.log("Is Vesting Enabled:", isVestingEnabled);
        console.log("Vesting Start:", vestingStart);
        console.log("Vesting Duration:", vestingDurationResult);
        console.log("Vesting End Time:", vestingEndTime);
        console.log("Current Time:", currentTime);
        
        console.log("USDT Escrow created successfully with ID:", vm.toString(escrowId));
    }

    function test_createEscrow_1Receiver_WithVesting() public {
        console.log("=== Test: Create Escrow - 1 Receiver, With Vesting (USDT) ===");
        
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        uint256 vestingStartTime = block.timestamp + 1 days;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Verify escrow was created
        assertTrue(escrowId != bytes32(0), "Escrow ID should not be zero");
        
        // Check escrow details
        (
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
        ) = escrowContract.getEscrowDetails(escrowId);
        
        assertEq(sender, owner, "Sender should be owner");
        assertEq(tokenAddress, address(mockUSDT), "Token address should be USDT");
        assertEq(totalAllocatedAmount, 1000 * 10**6, "Total allocated should be 1000 USDT");
        assertEq(receiverCount, 1, "Should have 1 receiver");
        assertEq(activeReceiverCount, 1, "Should have 1 active receiver");
        assertEq(receiverAddresses[0], alice, "Receiver should be alice");
        
        // Log escrow details
        console.log("=== Escrow Details ===");
        console.log("Escrow ID:", vm.toString(escrowId));
        console.log("Sender:", sender);
        console.log("Token Address:", tokenAddress);
        console.log("Total Allocated Amount:", totalAllocatedAmount);
        console.log("Total Deposited Amount:", totalDepositedAmount);
        console.log("Total Withdrawn Amount:", totalWithdrawnAmount);
        console.log("Available Balance:", availableBalance);
        console.log("Created At:", createdAt);
        console.log("Last Top Up At:", lastTopUpAt);
        console.log("Receiver Count:", receiverCount);
        console.log("Active Receiver Count:", activeReceiverCount);
        console.log("Receiver Addresses:");
        for (uint256 i = 0; i < receiverAddresses.length; i++) {
            console.log("  [%d]: %s", i, receiverAddresses[i]);
        }
        
        // Check vesting info (should be enabled)
        (
            bool isVestingEnabled,
            uint256 vestingStart,
            uint256 vestingDurationResult,
            uint256 vestingEndTime,
            uint256 currentTime
        ) = escrowContract.getVestingInfo(escrowId);
        
        assertTrue(isVestingEnabled, "Vesting should be enabled");
        assertEq(vestingStart, vestingStartTime, "Vesting start time should match");
        assertEq(vestingDurationResult, vestingDuration, "Vesting duration should match");
        assertEq(vestingEndTime, vestingStartTime + vestingDuration, "Vesting end time should be correct");
        
        // Log vesting info
        console.log("=== Vesting Info ===");
        console.log("Is Vesting Enabled:", isVestingEnabled);
        console.log("Vesting Start:", vestingStart);
        console.log("Vesting Duration:", vestingDurationResult);
        console.log("Vesting End Time:", vestingEndTime);
        console.log("Current Time:", currentTime);
        console.log("Vesting Progress: 0% (not started yet)");
        
        console.log("USDT Escrow with vesting created successfully with ID:", vm.toString(escrowId));
    }

    function test_createEscrow_2Receivers_WithVesting() public {
        console.log("=== Test: Create Escrow - 2 Receivers, With Vesting (USDT) ===");
        
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 2000 * 10**6; // 2000 USDT
        
        uint256 vestingStartTime = block.timestamp + 1 days;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Verify escrow was created
        assertTrue(escrowId != bytes32(0), "Escrow ID should not be zero");
        
        // Check escrow details
        (
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
        ) = escrowContract.getEscrowDetails(escrowId);
        
        assertEq(sender, owner, "Sender should be owner");
        assertEq(tokenAddress, address(mockUSDT), "Token address should be USDT");
        assertEq(totalAllocatedAmount, 3000 * 10**6, "Total allocated should be 3000 USDT");
        assertEq(receiverCount, 2, "Should have 2 receivers");
        assertEq(activeReceiverCount, 2, "Should have 2 active receivers");
        assertEq(receiverAddresses[0], alice, "First receiver should be alice");
        assertEq(receiverAddresses[1], bob, "Second receiver should be bob");
        
        // Log escrow details
        console.log("=== Escrow Details ===");
        console.log("Escrow ID:", vm.toString(escrowId));
        console.log("Sender:", sender);
        console.log("Token Address:", tokenAddress);
        console.log("Total Allocated Amount:", totalAllocatedAmount);
        console.log("Total Deposited Amount:", totalDepositedAmount);
        console.log("Total Withdrawn Amount:", totalWithdrawnAmount);
        console.log("Available Balance:", availableBalance);
        console.log("Created At:", createdAt);
        console.log("Last Top Up At:", lastTopUpAt);
        console.log("Receiver Count:", receiverCount);
        console.log("Active Receiver Count:", activeReceiverCount);
        console.log("Receiver Addresses:");
        for (uint256 i = 0; i < receiverAddresses.length; i++) {
            console.log("  [%d]: %s", i, receiverAddresses[i]);
        }
        
        // Check vesting info (should be enabled)
        (
            bool isVestingEnabled,
            uint256 vestingStart,
            uint256 vestingDurationResult,
            uint256 vestingEndTime,
            uint256 currentTime
        ) = escrowContract.getVestingInfo(escrowId);
        
        assertTrue(isVestingEnabled, "Vesting should be enabled");
        assertEq(vestingStart, vestingStartTime, "Vesting start time should match");
        assertEq(vestingDurationResult, vestingDuration, "Vesting duration should match");
        assertEq(vestingEndTime, vestingStartTime + vestingDuration, "Vesting end time should be correct");
        
        // Log vesting info
        console.log("=== Vesting Info ===");
        console.log("Is Vesting Enabled:", isVestingEnabled);
        console.log("Vesting Start:", vestingStart);
        console.log("Vesting Duration:", vestingDurationResult);
        console.log("Vesting End Time:", vestingEndTime);
        console.log("Current Time:", currentTime);
        console.log("Vesting Progress: 0% (not started yet)");
        
        console.log("USDT Escrow with vesting created successfully with ID:", vm.toString(escrowId));
    }
    
    // ============ CLOSE ESCROW TESTS ============
    
    function test_closeEscrow_Success_NoVesting() public {
        console.log("=== Test: Close Escrow - Success, No Vesting ===");
        
        // Create escrow with no vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Claim all tokens first
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        // Verify escrow is active
        assertTrue(escrowContract.isEscrowActive(escrowId), "Escrow should be active");
        
        // Close escrow
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Verify escrow is closed
        assertFalse(escrowContract.isEscrowActive(escrowId), "Escrow should be closed");
        
        console.log("Escrow closed successfully");
    }
    
    function test_closeEscrow_Success_WithVesting_AllClaimed() public {
        console.log("=== Test: Close Escrow - Success, With Vesting, All Claimed ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts now
            7 days // 7 days vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + 8 days);
        
        // Claim all tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        // Close escrow
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Verify escrow is closed
        assertFalse(escrowContract.isEscrowActive(escrowId), "Escrow should be closed");
        
        console.log("Escrow with vesting closed successfully after all tokens claimed");
    }

    function test_closeEscrow_Success_NoVesting_NoTokens() public {
        console.log("=== Test: Close Escrow - Success, No Vesting, No Tokens ===");
        
        // Create escrow without vesting and no top-up
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Close escrow (no tokens deposited, so no unclaimed amounts)
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Verify escrow is closed
        assertFalse(escrowContract.isEscrowActive(escrowId), "Escrow should be closed");
        
        console.log("Escrow without vesting closed successfully with no tokens");
    }

    function test_closeEscrow_Fail_UnclaimedTokens() public {
        console.log("=== Test: Close Escrow - Fail, Unclaimed Tokens ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts now
            7 days // 7 days vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Try to close escrow before vesting ends (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Cannot close escrow with remaining balance. Please withdraw all funds first.");
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        console.log("Escrow close failed as expected - unclaimed tokens with active vesting");
    }

    function test_closeEscrow_Fail_NotSender() public {
        console.log("=== Test: Close Escrow - Fail, Not Sender ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to close escrow as non-sender (should fail)
        vm.startPrank(alice);
        vm.expectRevert("Only escrow sender");
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        console.log("Escrow close failed as expected - not sender");
    }
    
    function test_closeEscrow_Fail_NonExistentEscrow() public {
        console.log("=== Test: Close Escrow - Fail, Non-Existent Escrow ===");
        
        // Try to close non-existent escrow (should fail)
        bytes32 nonExistentEscrowId = keccak256(abi.encodePacked("non-existent"));
        
        vm.startPrank(owner);
        vm.expectRevert("Escrow does not exist");
        escrowContract.closeEscrow(nonExistentEscrowId);
        vm.stopPrank();
        
        console.log("Escrow close failed as expected - non-existent escrow");
    }

    function test_closeEscrow_Fail_AlreadyClosed() public {
        console.log("=== Test: Close Escrow - Fail, Already Closed ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Close escrow first time
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Try to close escrow again (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Escrow is closed");
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        console.log("Escrow close failed as expected - already closed");
    }
    
    // ============ ADD RECEIVER TESTS ============
    
    function test_addReceiver_Success_NoVesting_NoTokens() public {
        console.log("=== Test: Add Receiver - Success, No Vesting, No Tokens ===");
        
        // Create escrow without vesting and no top-up
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Check total allocated amount before adding receiver
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before add receiver:", totalAllocatedAmountBefore);
        
        // Add new receiver (no tokens deposited, so availableBalance = 0)
        vm.startPrank(owner);
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount after adding receiver
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after add receiver:", totalAllocatedAmountAfter);
        
        // Verify receiver was added
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 500 * 10**6, "Bob's allocation should be 500 USDT");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertTrue(isActive, "Bob should be active");
        
        // Verify total allocated amount increased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore + 500 * 10**6, "Total allocated amount should increase by 500 USDT");
        
        console.log("Bob's current allocation:", currentAllocation);
        console.log("Receiver added successfully - no vesting, no tokens");
    }
    
    function test_addReceiver_Success_NoVesting_AllClaimed() public {
        console.log("=== Test: Add Receiver - Success, No Vesting, All Claimed ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Claim all tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount before adding receiver
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before add receiver:", totalAllocatedAmountBefore);
        
        // Add new receiver (all tokens claimed, so totalWithdrawnAmount = totalDepositedAmount)
        vm.startPrank(owner);
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount after adding receiver
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after add receiver:", totalAllocatedAmountAfter);
        
        // Verify receiver was added
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 500 * 10**6, "Bob's allocation should be 500 USDT");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertTrue(isActive, "Bob should be active");
        
        // Verify total allocated amount increased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore + 500 * 10**6, "Total allocated amount should increase by 500 USDT");
        
        console.log("Bob's current allocation:", currentAllocation);
        console.log("Receiver added successfully - no vesting, all claimed");
    }
    
    function test_addReceiver_Success_WithVesting_Completed() public {
        console.log("=== Test: Add Receiver - Success, With Vesting, Completed ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts now
            7 days // 7 days vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + 8 days);
        
        // Claim all tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount before adding receiver
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before add receiver:", totalAllocatedAmountBefore);
        
        // Add new receiver (vesting completed and all tokens claimed)
        vm.startPrank(owner);
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount after adding receiver
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after add receiver:", totalAllocatedAmountAfter);
        
        // Verify receiver was added
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 500 * 10**6, "Bob's allocation should be 500 USDT");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertTrue(isActive, "Bob should be active");
        
        // Verify total allocated amount increased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore + 500 * 10**6, "Total allocated amount should increase by 500 USDT");
        
        console.log("Bob's current allocation:", currentAllocation);
        console.log("Receiver added successfully - vesting completed, all claimed");
    }
    
    function test_addReceiver_Success_WithVesting_NoTokens() public {
        console.log("=== Test: Add Receiver - Success, With Vesting, No Tokens ===");
        
        // Create escrow with vesting but no top-up
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts now
            7 days // 7 days vesting
        );
        
        // Check total allocated amount before adding receiver
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before add receiver:", totalAllocatedAmountBefore);
        
        // Add new receiver (no tokens deposited, so availableBalance = 0)
        vm.startPrank(owner);
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        // Check total allocated amount after adding receiver
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after add receiver:", totalAllocatedAmountAfter);
        
        // Verify receiver was added
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 500 * 10**6, "Bob's allocation should be 500 USDT");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertTrue(isActive, "Bob should be active");
        
        // Verify total allocated amount increased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore + 500 * 10**6, "Total allocated amount should increase by 500 USDT");
        
        console.log("Bob's current allocation:", currentAllocation);
        console.log("Receiver added successfully - vesting enabled, no tokens");
    }
    
    function test_addReceiver_Fail_UnclaimedTokens_ActiveVesting() public {
        console.log("=== Test: Add Receiver - Fail, Unclaimed Tokens, Active Vesting ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts now
            7 days // 7 days vesting
        );
        
        // Top up escrow
        topUpEscrow(address(mockUSDT), escrowId, 1000 * 10**6);
        
        // Try to add receiver before vesting ends (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Cannot add receiver: escrow has significant unclaimed tokens and vesting is still active");
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - unclaimed tokens with active vesting");
    }
    
    function test_addReceiver_Fail_NotSender() public {
        console.log("=== Test: Add Receiver - Fail, Not Sender ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to add receiver as non-sender (should fail)
        vm.startPrank(alice);
        vm.expectRevert("Only escrow sender");
        escrowContract.addReceiver(escrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - not sender");
    }
    
    function test_addReceiver_Fail_NonExistentEscrow() public {
        console.log("=== Test: Add Receiver - Fail, Non-Existent Escrow ===");
        
        // Try to add receiver to non-existent escrow (should fail)
        bytes32 nonExistentEscrowId = keccak256(abi.encodePacked("non-existent"));
        
        vm.startPrank(owner);
        vm.expectRevert("Escrow does not exist");
        escrowContract.addReceiver(nonExistentEscrowId, bob, 500 * 10**6);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - non-existent escrow");
    }
    
    function test_addReceiver_Fail_AlreadyExists() public {
        console.log("=== Test: Add Receiver - Fail, Already Exists ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to add receiver that already exists (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Receiver already exists");
        escrowContract.addReceiver(escrowId, alice, 500 * 10**6);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - receiver already exists");
    }
    
    function test_addReceiver_Fail_InvalidAmount() public {
        console.log("=== Test: Add Receiver - Fail, Invalid Amount ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to add receiver with 0 amount (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Amount must be greater than 0");
        escrowContract.addReceiver(escrowId, bob, 0);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - invalid amount");
    }
    
    function test_addReceiver_Fail_InvalidAddress() public {
        console.log("=== Test: Add Receiver - Fail, Invalid Address ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to add receiver with address(0) (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Invalid receiver address");
        escrowContract.addReceiver(escrowId, address(0), 500 * 10**6);
        vm.stopPrank();
        
        console.log("Add receiver failed as expected - invalid address");
    }

    // ============ REMOVE RECEIVER TESTS ============
    
    function test_removeReceiver_Success_NoVesting_NoTokens() public {
        console.log("=== Test: Remove Receiver - Success, No Vesting, No Tokens ===");
        
        // Create escrow with 2 receivers, no vesting, no top-up
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Check initial state
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before remove receiver:", totalAllocatedAmountBefore);
        
        // Remove bob (should succeed since no tokens deposited)
        vm.startPrank(owner);
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        // Check state after removal
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after remove receiver:", totalAllocatedAmountAfter);
        
        // Verify bob was removed
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 0, "Bob's allocation should be 0");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertFalse(isActive, "Bob should be inactive");
        
        // Verify total allocated amount decreased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore - 500 * 10**6, "Total allocated amount should decrease by 500 USDT");
        
        // Verify alice is still active
        (currentAllocation, withdrawnAmount, isActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(currentAllocation, 1000 * 10**6, "Alice's allocation should remain 1000 USDT");
        assertTrue(isActive, "Alice should still be active");
        
        console.log("Receiver removed successfully - no vesting, no tokens");
    }
    
    function test_removeReceiver_Success_WithVesting_NoTokens() public {
        console.log("=== Test: Remove Receiver - Success, With Vesting, No Tokens ===");
        
        // Create escrow with 2 receivers, with vesting, no top-up
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp + 1 days, // Vesting starts in 1 day
            30 days // 30 days vesting
        );
        
        // Check initial state
        (,,uint256 totalAllocatedAmountBefore,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before remove receiver:", totalAllocatedAmountBefore);
        
        // Remove bob (should succeed since no tokens deposited)
        vm.startPrank(owner);
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        // Check state after removal
        (,,uint256 totalAllocatedAmountAfter,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after remove receiver:", totalAllocatedAmountAfter);
        
        // Verify bob was removed
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 0, "Bob's allocation should be 0");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertFalse(isActive, "Bob should be inactive");
        
        // Verify total allocated amount decreased
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore - 500 * 10**6, "Total allocated amount should decrease by 500 USDT");
        
        console.log("Receiver removed successfully - with vesting, no tokens");
    }
    
    function test_removeReceiver_Success_AllTokensClaimed() public {
        console.log("=== Test: Remove Receiver - Success, All Tokens Claimed ===");
        
        // Create escrow with 2 receivers, no vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up escrow with funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 2000 * 10**6);
        escrowContract.topUpFunds(escrowId, 2000 * 10**6);
        vm.stopPrank();
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 500 * 10**6);
        vm.stopPrank();
        
        // Check that all tokens are claimed (accounting for platform fees)
        (,,,uint256 totalDepositedAmount,uint256 totalWithdrawnAmount,uint256 availableBalance,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // The totalWithdrawnAmount should equal the total allocation (1500 USDT)
        // Platform fees are deducted from the net amount sent to receivers, not from totalWithdrawnAmount
        uint256 totalAllocation = 1500 * 10**6; // 1000 + 500 USDT
        
        assertEq(totalWithdrawnAmount, totalAllocation, "All tokens should be claimed");
        assertEq(availableBalance, totalDepositedAmount - totalWithdrawnAmount, "Available balance should be remaining after withdrawals");
        
        // Now remove bob (should succeed since all tokens claimed)
        vm.startPrank(owner);
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        // Verify bob was removed
        (uint256 currentAllocation, uint256 withdrawnAmount, bool isActive) = escrowContract.getReceiverDetails(escrowId, bob);
        assertEq(currentAllocation, 0, "Bob's allocation should be 0");
        assertEq(withdrawnAmount, 0, "Bob's withdrawn amount should be 0");
        assertFalse(isActive, "Bob should be inactive");
        
        console.log("Receiver removed successfully - all tokens claimed");
    }
    
    function test_removeReceiver_Fail_NonExistentEscrow() public {
        console.log("=== Test: Remove Receiver - Fail, Non-Existent Escrow ===");
        
        // Try to remove receiver from non-existent escrow (should fail)
        bytes32 nonExistentEscrowId = keccak256(abi.encodePacked("non-existent"));
        
        vm.startPrank(owner);
        vm.expectRevert("Escrow does not exist");
        escrowContract.removeReceiver(nonExistentEscrowId, alice);
        vm.stopPrank();
        
        console.log("Remove receiver failed as expected - non-existent escrow");
    }
    
    function test_removeReceiver_Fail_NotSender() public {
        console.log("=== Test: Remove Receiver - Fail, Not Sender ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to remove receiver as non-sender (should fail)
        vm.startPrank(alice);
        vm.expectRevert("Only escrow sender");
        escrowContract.removeReceiver(escrowId, alice);
        vm.stopPrank();
        
        console.log("Remove receiver failed as expected - not sender");
    }
    
    function test_removeReceiver_Fail_ReceiverDoesNotExist() public {
        console.log("=== Test: Remove Receiver - Fail, Receiver Does Not Exist ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to remove receiver that doesn't exist (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Receiver does not exist");
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        console.log("Remove receiver failed as expected - receiver does not exist");
    }
    
    function test_removeReceiver_Fail_ReceiverAlreadyInactive() public {
        console.log("=== Test: Remove Receiver - Fail, Receiver Already Inactive ===");
        
        // Create escrow with 2 receivers
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Remove bob first time (should succeed)
        vm.startPrank(owner);
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        // Try to remove bob again (should fail - receiver data is deleted, so it's "does not exist")
        vm.startPrank(owner);
        vm.expectRevert("Receiver does not exist");
        escrowContract.removeReceiver(escrowId, bob);
        vm.stopPrank();
        
        console.log("Remove receiver failed as expected - receiver does not exist (already removed)");
    }
    
    function test_removeReceiver_Fail_EscrowClosed() public {
        console.log("=== Test: Remove Receiver - Fail, Escrow Closed ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Close escrow
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Try to remove receiver from closed escrow (should fail)
        vm.startPrank(owner);
        vm.expectRevert("Escrow is closed");
        escrowContract.removeReceiver(escrowId, alice);
        vm.stopPrank();
        
        console.log("Remove receiver failed as expected - escrow closed");
    }

    // ============ TOP-UP FUNDS TESTS ============
    
    function test_topUpFunds_Success_NoVesting_LessThanAllocation() public {
        console.log("=== Test: Top-Up Funds - Success, No Vesting, Less Than Allocation ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Check initial state
        (,,uint256 totalAllocatedAmountBefore,uint256 totalDepositedAmountBefore,,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before top-up:", totalAllocatedAmountBefore);
        console.log("Total deposited amount before top-up:", totalDepositedAmountBefore);
        console.log("Available balance before top-up:", availableBalanceBefore);
        
        // Top up with amount less than total allocation (800 USDT < 1500 USDT)
        uint256 topUpAmount = 800 * 10**6;
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after top-up
        (,,uint256 totalAllocatedAmountAfter,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after top-up:", totalAllocatedAmountAfter);
        console.log("Total deposited amount after top-up:", totalDepositedAmountAfter);
        console.log("Available balance after top-up:", availableBalanceAfter);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore, "Total allocated amount should remain the same");
        
        console.log("Top-up successful - no vesting, less than allocation");
    }
    
    function test_topUpFunds_Success_WithVesting_LessThanAllocation() public {
        console.log("=== Test: Top-Up Funds - Success, With Vesting, Less Than Allocation ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp + 1 days, // Vesting starts in 1 day
            30 days // 30 days vesting
        );
        
        // Check initial state
        (,,uint256 totalAllocatedAmountBefore,uint256 totalDepositedAmountBefore,,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount before top-up:", totalAllocatedAmountBefore);
        console.log("Available balance before top-up:", availableBalanceBefore);
        
        // Top up with amount less than total allocation (800 USDT < 1500 USDT)
        uint256 topUpAmount = 800 * 10**6;
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after top-up
        (,,uint256 totalAllocatedAmountAfter,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        console.log("Total allocated amount after top-up:", totalAllocatedAmountAfter);
        console.log("Available balance after top-up:", availableBalanceAfter);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        assertEq(totalAllocatedAmountAfter, totalAllocatedAmountBefore, "Total allocated amount should remain the same");
        
        console.log("Top-up successful - with vesting, less than allocation");
    }
    
    function test_topUpFunds_Success_AfterVestingCompleted_AllClaimed() public {
        console.log("=== Test: Top-Up Funds - Success, After Vesting Completed, All Claimed ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts immediately
            1 days // 1 day vesting
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 2000 * 10**6);
        escrowContract.topUpFunds(escrowId, 2000 * 10**6);
        vm.stopPrank();
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + 2 days);
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 500 * 10**6);
        vm.stopPrank();
        
        // Verify all tokens are claimed
        (,,,uint256 totalDepositedAmountBefore,uint256 totalWithdrawnAmountBefore,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalWithdrawnAmountBefore, 1500 * 10**6, "All tokens should be claimed");
        
        // Now top up again (should succeed since all tokens claimed)
        uint256 topUpAmount = 1000 * 10**6;
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after top-up
        (,,,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        
        console.log("Top-up successful - after vesting completed, all claimed");
    }
    
    function test_topUpWithNewVesting_Success_SameReceiverAmounts() public {
        console.log("=== Test: Top-Up With New Vesting - Success, Same Receiver Amounts ===");
        
        // Create escrow with initial vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts immediately
            1 days // 1 day vesting
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 2000 * 10**6);
        escrowContract.topUpFunds(escrowId, 2000 * 10**6);
        vm.stopPrank();
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + 2 days);
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 500 * 10**6);
        vm.stopPrank();
        
        // Now top up with new vesting schedule (same receiver amounts)
        uint256[] memory newAmounts = new uint256[](2);
        newAmounts[0] = 1000 * 10**6; // Same as before
        newAmounts[1] = 500 * 10**6;  // Same as before
        
        uint256 topUpAmount = 1500 * 10**6; // Total of new amounts
        uint256 newVestingStartTime = block.timestamp + 1 days;
        uint256 newVestingDuration = 60 days;
        
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpWithNewVesting(escrowId, topUpAmount, newVestingStartTime, newVestingDuration, newAmounts);
        vm.stopPrank();
        
        // Check vesting info
        (bool isVestingEnabled, uint256 vestingStartTime, uint256 vestingDuration, uint256 vestingEndTime,) = escrowContract.getVestingInfo(escrowId);
        
        assertTrue(isVestingEnabled, "Vesting should be enabled");
        assertEq(vestingStartTime, newVestingStartTime, "Vesting start time should be updated");
        assertEq(vestingDuration, newVestingDuration, "Vesting duration should be updated");
        assertEq(vestingEndTime, newVestingStartTime + newVestingDuration, "Vesting end time should be correct");
        
        // Check receiver amounts are reset
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        assertEq(aliceAllocation, 1000 * 10**6, "Alice's allocation should be reset to 1000 USDT");
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertTrue(aliceActive, "Alice should be active");
        
        assertEq(bobAllocation, 500 * 10**6, "Bob's allocation should be reset to 500 USDT");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        assertTrue(bobActive, "Bob should be active");
        
        console.log("Top-up with new vesting successful - same receiver amounts");
    }
    
    function test_topUpWithNewVesting_Success_UpdatedReceiverAmounts() public {
        console.log("=== Test: Top-Up With New Vesting - Success, Updated Receiver Amounts ===");
        
        // Create escrow with initial vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        amounts[1] = 500 * 10**6;  // 500 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts immediately
            1 days // 1 day vesting
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 2000 * 10**6);
        escrowContract.topUpFunds(escrowId, 2000 * 10**6);
        vm.stopPrank();
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + 2 days);
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 500 * 10**6);
        vm.stopPrank();
        
        // Now top up with new vesting schedule (updated receiver amounts)
        uint256[] memory newAmounts = new uint256[](2);
        newAmounts[0] = 1500 * 10**6; // Increased from 1000 to 1500
        newAmounts[1] = 750 * 10**6;  // Increased from 500 to 750
        
        uint256 topUpAmount = 2250 * 10**6; // Total of new amounts
        uint256 newVestingStartTime = block.timestamp + 1 days;
        uint256 newVestingDuration = 90 days;
        
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpWithNewVesting(escrowId, topUpAmount, newVestingStartTime, newVestingDuration, newAmounts);
        vm.stopPrank();
        
        // Check vesting info
        (bool isVestingEnabled, uint256 vestingStartTime, uint256 vestingDuration,,) = escrowContract.getVestingInfo(escrowId);
        
        assertTrue(isVestingEnabled, "Vesting should be enabled");
        assertEq(vestingStartTime, newVestingStartTime, "Vesting start time should be updated");
        assertEq(vestingDuration, newVestingDuration, "Vesting duration should be updated");
        
        // Check receiver amounts are updated
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        assertEq(aliceAllocation, 1500 * 10**6, "Alice's allocation should be updated to 1500 USDT");
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertTrue(aliceActive, "Alice should be active");
        
        assertEq(bobAllocation, 750 * 10**6, "Bob's allocation should be updated to 750 USDT");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        assertTrue(bobActive, "Bob should be active");
        
        // Check total allocated amount is updated
        (,,uint256 totalAllocatedAmount,,,,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalAllocatedAmount, 2250 * 10**6, "Total allocated amount should be updated to 2250 USDT");
        
        console.log("Top-up with new vesting successful - updated receiver amounts");
    }
    
    function test_topUpFunds_Fail_NonExistentEscrow() public {
        console.log("=== Test: Top-Up Funds - Fail, Non-Existent Escrow ===");
        
        // Try to top up non-existent escrow (should fail)
        bytes32 nonExistentEscrowId = keccak256(abi.encodePacked("non-existent"));
        
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 1000 * 10**6);
        vm.expectRevert("Escrow does not exist");
        escrowContract.topUpFunds(nonExistentEscrowId, 1000 * 10**6);
        vm.stopPrank();
        
        console.log("Top-up failed as expected - non-existent escrow");
    }
    
    function test_topUpFunds_Fail_NotSender() public {
        console.log("=== Test: Top-Up Funds - Fail, Not Sender ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to top up as non-sender (should fail)
        vm.startPrank(alice);
        mockUSDT.approve(address(escrowContract), 1000 * 10**6);
        vm.expectRevert("Only escrow sender");
        escrowContract.topUpFunds(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        console.log("Top-up failed as expected - not sender");
    }
    
    function test_topUpFunds_Fail_EscrowClosed() public {
        console.log("=== Test: Top-Up Funds - Fail, Escrow Closed ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Close escrow
        vm.startPrank(owner);
        escrowContract.closeEscrow(escrowId);
        vm.stopPrank();
        
        // Try to top up closed escrow (should fail)
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 1000 * 10**6);
        vm.expectRevert("Escrow is closed");
        escrowContract.topUpFunds(escrowId, 1000 * 10**6);
        vm.stopPrank();
        
        console.log("Top-up failed as expected - escrow closed");
    }
    
    function test_topUpFunds_Fail_ZeroAmount() public {
        console.log("=== Test: Top-Up Funds - Fail, Zero Amount ===");
        
        // Create escrow
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10**6; // 1000 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Try to top up with zero amount (should fail)
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 0);
        vm.expectRevert("Amount must be greater than 0");
        escrowContract.topUpFunds(escrowId, 0);
        vm.stopPrank();
        
        console.log("Top-up failed as expected - zero amount");
    }
    
    // ============ TOP-UP AFTER ALL CLAIMED TESTS ============
    
    function test_topUpAfterAllClaimed_NoVesting_SameAllocations() public {
        console.log("=== Test: Top-Up After All Claimed - No Vesting, Same Allocations ===");
        
        // Create escrow without vesting with 2 receivers
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**6; // 100 USDT
        amounts[1] = 200 * 10**6; // 200 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 300 * 10**6);
        escrowContract.topUpFunds(escrowId, 300 * 10**6);
        vm.stopPrank();
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 200 * 10**6);
        vm.stopPrank();
        
        // Verify all tokens are claimed
        (,,,uint256 totalDepositedAmountBefore,uint256 totalWithdrawnAmountBefore,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalWithdrawnAmountBefore, 300 * 10**6, "All tokens should be claimed");
        assertEq(availableBalanceBefore, 0, "Available balance should be 0");
        
        // Now top up again with same allocations (should succeed)
        uint256 topUpAmount = 300 * 10**6; // Same as total allocation
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after top-up
        (,,,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        
        // Verify receiver allocations remain the same
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        // Console log allocation balance after topup
        console.log("After second top-up:");
        console.log("Alice allocation:", aliceAllocation);
        console.log("Alice withdrawn:", aliceWithdrawn);
        console.log("Bob allocation:", bobAllocation);
        console.log("Bob withdrawn:", bobWithdrawn);
        console.log("Total deposited amount:", totalDepositedAmountAfter);
        console.log("Available balance:", availableBalanceAfter);
        
        assertEq(aliceAllocation, 100 * 10**6, "Alice's allocation should remain 100 USDT");
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertTrue(aliceActive, "Alice should be active");
        
        assertEq(bobAllocation, 200 * 10**6, "Bob's allocation should remain 200 USDT");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        assertTrue(bobActive, "Bob should be active");
        
        console.log("Top-up after all claimed successful - no vesting, same allocations");
    }
    
    function test_topUpAfterAllClaimed_WithVesting_SameVestingDuration() public {
        console.log("=== Test: Top-Up After All Claimed - With Vesting, Same Vesting Duration ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**6; // 100 USDT
        amounts[1] = 200 * 10**6; // 200 USDT
        
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts immediately
            vestingDuration
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 300 * 10**6);
        escrowContract.topUpFunds(escrowId, 300 * 10**6);
        vm.stopPrank();
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + vestingDuration + 1 days);
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 200 * 10**6);
        vm.stopPrank();
        
        // Verify all tokens are claimed
        (,,,uint256 totalDepositedAmountBefore,uint256 totalWithdrawnAmountBefore,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalWithdrawnAmountBefore, 300 * 10**6, "All tokens should be claimed");
        assertEq(availableBalanceBefore, 0, "Available balance should be 0");
        
        // Now top up again with same vesting duration (should succeed)
        uint256 topUpAmount = 300 * 10**6; // Same as total allocation
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after top-up
        (,,,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        
        // Verify receiver allocations remain the same
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        // Console log allocation balance after topup
        console.log("After second top-up:");
        console.log("Alice allocation:", aliceAllocation);
        console.log("Alice withdrawn:", aliceWithdrawn);
        console.log("Bob allocation:", bobAllocation);
        console.log("Bob withdrawn:", bobWithdrawn);
        console.log("Total deposited amount:", totalDepositedAmountAfter);
        console.log("Available balance:", availableBalanceAfter);
        
        assertEq(aliceAllocation, 100 * 10**6, "Alice's allocation should remain 100 USDT");
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertTrue(aliceActive, "Alice should be active");
        
        assertEq(bobAllocation, 200 * 10**6, "Bob's allocation should remain 200 USDT");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        assertTrue(bobActive, "Bob should be active");
        
        // Verify vesting info remains the same
        (bool isVestingEnabled, uint256 vestingStartTime, uint256 vestingDurationAfter,,) = escrowContract.getVestingInfo(escrowId);
        assertTrue(isVestingEnabled, "Vesting should still be enabled");
        assertEq(vestingDurationAfter, vestingDuration, "Vesting duration should remain the same");
        
        console.log("Top-up after all claimed successful - with vesting, same vesting duration");
    }
    
    function test_topUpAfterAllClaimed_WithVesting_CustomVestingDuration() public {
        console.log("=== Test: Top-Up After All Claimed - With Vesting, Custom Vesting Duration ===");
        
        // Create escrow with initial vesting
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**6; // 100 USDT
        amounts[1] = 200 * 10**6; // 200 USDT
        
        uint256 initialVestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            block.timestamp, // Vesting starts immediately
            initialVestingDuration
        );
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 300 * 10**6);
        escrowContract.topUpFunds(escrowId, 300 * 10**6);
        vm.stopPrank();
        
        // Fast forward past vesting period
        vm.warp(block.timestamp + initialVestingDuration + 1 days);
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 200 * 10**6);
        vm.stopPrank();
        
        // Verify all tokens are claimed
        (,,,uint256 totalDepositedAmountBefore,uint256 totalWithdrawnAmountBefore,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalWithdrawnAmountBefore, 300 * 10**6, "All tokens should be claimed");
        assertEq(availableBalanceBefore, 0, "Available balance should be 0");
        
        // Now top up with custom vesting duration using topUpWithNewVesting
        uint256[] memory newAmounts = new uint256[](2);
        newAmounts[0] = 100 * 10**6; // Same as before
        newAmounts[1] = 200 * 10**6; // Same as before
        
        uint256 topUpAmount = 300 * 10**6; // Same as total allocation
        uint256 customVestingStartTime = block.timestamp + 1 days;
        uint256 customVestingDuration = 60 days; // Different from initial 30 days
        
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpWithNewVesting(escrowId, topUpAmount, customVestingStartTime, customVestingDuration, newAmounts);
        vm.stopPrank();
        
        // Check state after top-up
        (,,,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        
        // Verify receiver allocations are reset to same amounts
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        // Console log allocation balance after topup
        console.log("After second top-up:");
        console.log("Alice allocation:", aliceAllocation);
        console.log("Alice withdrawn:", aliceWithdrawn);
        console.log("Bob allocation:", bobAllocation);
        console.log("Bob withdrawn:", bobWithdrawn);
        console.log("Total deposited amount:", totalDepositedAmountAfter);
        console.log("Available balance:", availableBalanceAfter);
        
        assertEq(aliceAllocation, 100 * 10**6, "Alice's allocation should be reset to 100 USDT");
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertTrue(aliceActive, "Alice should be active");
        
        assertEq(bobAllocation, 200 * 10**6, "Bob's allocation should be reset to 200 USDT");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        assertTrue(bobActive, "Bob should be active");
        
        // Verify custom vesting info
        (bool isVestingEnabled, uint256 vestingStartTime, uint256 vestingDurationAfter,,) = escrowContract.getVestingInfo(escrowId);
        assertTrue(isVestingEnabled, "Vesting should be enabled");
        assertEq(vestingStartTime, customVestingStartTime, "Vesting start time should be custom");
        assertEq(vestingDurationAfter, customVestingDuration, "Vesting duration should be custom");
        
        console.log("Top-up after all claimed successful - with vesting, custom vesting duration");
    }
    
    // ============ WITHDRAW TOKEN TO CRYPTO TESTS ============
    
    function test_withdrawTokenToCrypto_NoVesting_FullWithdraw() public {
        console.log("=== Test: Withdraw Token To Crypto - No Vesting, Full Withdraw ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Alice withdraws full amount
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 netAmount = 100 * 10**6 - (100 * 10**6 * 25) / 10000; // 100 USDT - 0.25 USDT fee
        
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Net amount received:", aliceBalanceAfter - aliceBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter - aliceBalanceBefore, netAmount, "Alice should receive correct net amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, 100 * 10**6, "Alice's withdrawn amount should be 100 USDT");
        assertTrue(aliceActive, "Alice should still be active");
        
        console.log("Withdraw token to crypto successful - no vesting, full withdraw");
    }
    
    function test_withdrawTokenToCrypto_NoVesting_PartialWithdraw() public {
        console.log("=== Test: Withdraw Token To Crypto - No Vesting, Partial Withdraw ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Alice withdraws partial amount (50 USDT)
        uint256 withdrawAmount = 50 * 10**6;
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, withdrawAmount);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 netAmount = withdrawAmount - (withdrawAmount * 25) / 10000; // 50 USDT - 0.125 USDT fee
        
        console.log("Withdraw amount:", withdrawAmount);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Net amount received:", aliceBalanceAfter - aliceBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter - aliceBalanceBefore, netAmount, "Alice should receive correct net amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, withdrawAmount, "Alice's withdrawn amount should be 50 USDT");
        assertTrue(aliceActive, "Alice should still be active");
        
        // Alice can withdraw remaining amount
        uint256 remainingAmount = 100 * 10**6 - withdrawAmount;
        aliceBalanceBefore = mockUSDT.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, remainingAmount);
        vm.stopPrank();
        
        aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 remainingNetAmount = remainingAmount - (remainingAmount * 25) / 10000;
        
        console.log("Remaining withdraw amount:", remainingAmount);
        console.log("Alice balance after remaining withdraw:", aliceBalanceAfter);
        console.log("Total net amount received:", aliceBalanceAfter - mockUSDT.balanceOf(alice) + remainingNetAmount);
        
        // Verify final state
        (aliceAllocation, aliceWithdrawn, aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, 100 * 10**6, "Alice's total withdrawn amount should be 100 USDT");
        
        console.log("Withdraw token to crypto successful - no vesting, partial withdraw");
    }
    
    function test_withdrawTokenToCrypto_WithVesting_DuringVesting() public {
        console.log("=== Test: Withdraw Token To Crypto - With Vesting, During Vesting ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Move time to after vesting start (1 day into vesting period)
        vm.warp(vestingStartTime + 1 days);
        
        // Alice tries to withdraw during vesting (should work)
        // First check vested amount
        (uint256 vestedAmount,) = escrowContract.calculateVestedAmount(escrowId, alice);
        console.log("Vested amount:", vestedAmount);
        
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, vestedAmount);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 netAmount = vestedAmount - (vestedAmount * 25) / 10000; // vested amount - fee
        
        console.log("Vesting start time:", vestingStartTime);
        console.log("Current time:", block.timestamp);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Net amount received:", aliceBalanceAfter - aliceBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter - aliceBalanceBefore, netAmount, "Alice should receive correct net amount during vesting");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, vestedAmount, "Alice's withdrawn amount should equal vested amount");
        assertTrue(aliceActive, "Alice should still be active");
        
        console.log("Withdraw token to crypto successful - with vesting, during vesting");
    }
    
    function test_withdrawTokenToCrypto_WithVesting_NoTopUp() public {
        console.log("=== Test: Withdraw Token To Crypto - With Vesting, No Top Up ===");
        
        // Create escrow with vesting but no top up
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Move time to start of vesting
        vm.warp(vestingStartTime);
        
        // Alice tries to withdraw without top up (should fail)
        vm.startPrank(alice);
        vm.expectRevert("Amount exceeds vested amount");
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - no top up funds");
        
        // Verify receiver state unchanged
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be 0");
        assertTrue(aliceActive, "Alice should still be active");
        
        console.log("Withdraw token to crypto test successful - with vesting, no top up");
    }
    
    function test_withdrawTokenToCrypto_WithVesting_PartialDuringVesting() public {
        console.log("=== Test: Withdraw Token To Crypto - With Vesting, Partial During Vesting ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Move time to after vesting start (1 day into vesting period)
        vm.warp(vestingStartTime + 1 days);
        
        // Alice withdraws partial amount during vesting
        // First check vested amount
        (uint256 vestedAmount,) = escrowContract.calculateVestedAmount(escrowId, alice);
        console.log("Vested amount:", vestedAmount);
        
        uint256 partialAmount = 3 * 10**6; // 3 USDT (minimum amount)
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, partialAmount);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 netAmount = partialAmount - (partialAmount * 25) / 10000; // 30 USDT - 0.075 USDT fee
        
        console.log("Partial withdraw amount:", partialAmount);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Net amount received:", aliceBalanceAfter - aliceBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter - aliceBalanceBefore, netAmount, "Alice should receive correct partial amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, partialAmount, "Alice's withdrawn amount should equal partial amount");
        assertTrue(aliceActive, "Alice should still be active");
        
        // Alice can withdraw remaining vested amount (not the full allocation)
        uint256 remainingVestedAmount = vestedAmount - partialAmount;
        
        // Only withdraw remaining amount if it's at least the minimum
        if (remainingVestedAmount >= 3 * 10**6) {
            aliceBalanceBefore = mockUSDT.balanceOf(alice);
            vm.startPrank(alice);
            escrowContract.withdrawTokenToCrypto(escrowId, remainingVestedAmount);
            vm.stopPrank();
            
            aliceBalanceAfter = mockUSDT.balanceOf(alice);
            uint256 remainingNetAmount = remainingVestedAmount - (remainingVestedAmount * 25) / 10000;
            
            console.log("Remaining vested amount:", remainingVestedAmount);
            console.log("Total net amount received:", aliceBalanceAfter - aliceBalanceBefore + remainingNetAmount);
        } else {
            console.log("Remaining vested amount too small for withdrawal:", remainingVestedAmount);
        }
        
        // Verify final state
        (aliceAllocation, aliceWithdrawn, aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, partialAmount, "Alice's withdrawn amount should equal partial amount");
        
        console.log("Withdraw token to crypto successful - with vesting, partial during vesting");
    }

    function test_withdrawTokenToCrypto_BelowMinimumAmount() public {
        console.log("=== Test: Withdraw Token To Crypto - Below Minimum Amount (2 USDT) ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Try to withdraw below minimum amount (2 USDT)
        vm.startPrank(alice);
        vm.expectRevert("Minimum withdrawal amount is 3 USDT");
        escrowContract.withdrawTokenToCrypto(escrowId, 2 * 10**6);
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - below minimum amount");
        console.log("Withdraw token to crypto test successful - below minimum amount");
    }

    // ========== WITHDRAW TOKEN TO FIAT TESTS ==========

    function test_withdrawTokenToFiat_NoVesting_FullWithdraw() public {
        console.log("=== Test: Withdraw Token To Fiat - No Vesting, Full Withdraw ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, 100 * 10**6, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = 100 * 10**6 - (100 * 10**6 * 25) / 10000; // 100 USDT - 0.25 USDT fee
        
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter, aliceBalanceBefore, "Alice's balance should not change (tokens go to deposit wallet)");
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct net amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, 100 * 10**6, "Alice's withdrawn amount should be 100 USDT");
        assertTrue(aliceActive, "Alice should still be active");
        
        console.log("Withdraw token to fiat successful - no vesting, full withdraw");
    }

    function test_withdrawTokenToFiat_NoVesting_PartialWithdraw() public {
        console.log("=== Test: Withdraw Token To Fiat - No Vesting, Partial Withdraw ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        uint256 withdrawAmount = 50 * 10**6; // 50 USDT
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, withdrawAmount, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = withdrawAmount - (withdrawAmount * 25) / 10000; // 50 USDT - 0.125 USDT fee
        
        console.log("Withdraw amount:", withdrawAmount);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter, aliceBalanceBefore, "Alice's balance should not change");
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct net amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, withdrawAmount, "Alice's withdrawn amount should be 50 USDT");
        assertTrue(aliceActive, "Alice should still be active");
        
        // Alice can withdraw remaining amount
        uint256 remainingAmount = 100 * 10**6 - withdrawAmount;
        fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, remainingAmount, fiatDepositWallet);
        vm.stopPrank();
        
        fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 remainingNetAmount = remainingAmount - (remainingAmount * 25) / 10000;
        
        console.log("Remaining withdraw amount:", remainingAmount);
        console.log("Total net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore + remainingNetAmount);
        
        // Verify final state
        (aliceAllocation, aliceWithdrawn, aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, 100 * 10**6, "Alice's total withdrawn amount should be 100 USDT");
        
        console.log("Withdraw token to fiat successful - no vesting, partial withdraw");
    }

    function test_withdrawTokenToFiat_WithVesting_DuringVesting() public {
        console.log("=== Test: Withdraw Token To Fiat - With Vesting, During Vesting ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Move time to after vesting start (1 day into vesting period)
        vm.warp(vestingStartTime + 1 days);
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        // Alice tries to withdraw during vesting (should work)
        // First check vested amount
        (uint256 vestedAmount,) = escrowContract.calculateVestedAmount(escrowId, alice);
        console.log("Vested amount:", vestedAmount);
        
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, vestedAmount, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = vestedAmount - (vestedAmount * 25) / 10000; // vested amount - fee
        
        console.log("Vesting start time:", vestingStartTime);
        console.log("Current time:", block.timestamp);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter, aliceBalanceBefore, "Alice's balance should not change");
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct net amount during vesting");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, vestedAmount, "Alice's withdrawn amount should equal vested amount");
        assertTrue(aliceActive, "Alice should still be active");
        
        console.log("Withdraw token to fiat successful - with vesting, during vesting");
    }

    function test_withdrawTokenToFiat_WithVesting_NoTopUp() public {
        console.log("=== Test: Withdraw Token To Fiat - With Vesting, No Top Up ===");
        
        // Create escrow with vesting but no top up
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Move time to after vesting start
        vm.warp(vestingStartTime + 1 days);
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        // Alice tries to withdraw but should fail due to no top up
        vm.startPrank(alice);
        vm.expectRevert("Amount exceeds vested amount");
        escrowContract.withdrawTokenToFiat(escrowId, 10 * 10**6, fiatDepositWallet);
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - no top up funds");
        console.log("Withdraw token to fiat test successful - with vesting, no top up");
    }

    function test_withdrawTokenToFiat_WithVesting_PartialDuringVesting() public {
        console.log("=== Test: Withdraw Token To Fiat - With Vesting, Partial During Vesting ===");
        
        // Create escrow with vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        uint256 vestingStartTime = block.timestamp + 1;
        uint256 vestingDuration = 30 days;
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            vestingStartTime,
            vestingDuration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Move time to after vesting start (1 day into vesting period)
        vm.warp(vestingStartTime + 1 days);
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        // Alice withdraws partial amount during vesting
        // First check vested amount
        (uint256 vestedAmount,) = escrowContract.calculateVestedAmount(escrowId, alice);
        console.log("Vested amount:", vestedAmount);
        
        uint256 partialAmount = 3 * 10**6; // 3 USDT (minimum amount)
        uint256 aliceBalanceBefore = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, partialAmount, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 aliceBalanceAfter = mockUSDT.balanceOf(alice);
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = partialAmount - (partialAmount * 25) / 10000; // partial amount - fee
        
        console.log("Partial withdraw amount:", partialAmount);
        console.log("Alice balance before:", aliceBalanceBefore);
        console.log("Alice balance after:", aliceBalanceAfter);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(aliceBalanceAfter, aliceBalanceBefore, "Alice's balance should not change");
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct partial amount");
        
        // Verify receiver state
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, partialAmount, "Alice's withdrawn amount should equal partial amount");
        assertTrue(aliceActive, "Alice should still be active");
        
        // Alice can withdraw remaining vested amount (not the full allocation)
        uint256 remainingVestedAmount = vestedAmount - partialAmount;
        
        // Only withdraw remaining amount if it's at least the minimum
        if (remainingVestedAmount >= 3 * 10**6) {
            fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
            vm.startPrank(alice);
            escrowContract.withdrawTokenToFiat(escrowId, remainingVestedAmount, fiatDepositWallet);
            vm.stopPrank();
            
            fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
            uint256 remainingNetAmount = remainingVestedAmount - (remainingVestedAmount * 25) / 10000;
            
            console.log("Remaining vested amount:", remainingVestedAmount);
            console.log("Total net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore + remainingNetAmount);
        } else {
            console.log("Remaining vested amount too small for withdrawal:", remainingVestedAmount);
        }
        
        // Verify final state
        (aliceAllocation, aliceWithdrawn, aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        assertEq(aliceWithdrawn, partialAmount, "Alice's withdrawn amount should equal partial amount");
        
        console.log("Withdraw token to fiat successful - with vesting, partial during vesting");
    }

    function test_withdrawTokenToFiat_MinimumAmount() public {
        console.log("=== Test: Withdraw Token To Fiat - Minimum Amount (3 USDT) ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        uint256 minAmount = 3 * 10**6; // 3 USDT
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, minAmount, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = minAmount - (minAmount * 25) / 10000; // 3 USDT - 0.0075 USDT fee
        
        console.log("Minimum withdraw amount:", minAmount);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct minimum amount");
        
        console.log("Withdraw token to fiat successful - minimum amount");
    }

    function test_withdrawTokenToFiat_BelowMinimumAmount() public {
        console.log("=== Test: Withdraw Token To Fiat - Below Minimum Amount (2 USDT) ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        // Try to withdraw below minimum amount (2 USDT)
        vm.startPrank(alice);
        vm.expectRevert("Minimum withdrawal amount is 3 USDT");
        escrowContract.withdrawTokenToFiat(escrowId, 2 * 10**6, fiatDepositWallet);
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - below minimum amount");
        console.log("Withdraw token to fiat test successful - below minimum amount");
    }

    function test_withdrawTokenToFiat_MaximumAmount() public {
        console.log("=== Test: Withdraw Token To Fiat - Maximum Amount (5000 USDT) ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10000 * 10**6; // 10000 USDT (more than max to test max limit)
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 10000 * 10**6);
        escrowContract.topUpFunds(escrowId, 10000 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        uint256 maxAmount = 5000 * 10**6; // 5000 USDT
        uint256 fiatDepositWalletBalanceBefore = mockUSDT.balanceOf(fiatDepositWallet);
        
        vm.startPrank(alice);
        escrowContract.withdrawTokenToFiat(escrowId, maxAmount, fiatDepositWallet);
        vm.stopPrank();
        
        uint256 fiatDepositWalletBalanceAfter = mockUSDT.balanceOf(fiatDepositWallet);
        uint256 netAmount = maxAmount - (maxAmount * 25) / 10000; // 5000 USDT - 12.5 USDT fee
        
        console.log("Maximum withdraw amount:", maxAmount);
        console.log("Deposit wallet balance before:", fiatDepositWalletBalanceBefore);
        console.log("Deposit wallet balance after:", fiatDepositWalletBalanceAfter);
        console.log("Net amount received by deposit wallet:", fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore);
        console.log("Expected net amount:", netAmount);
        
        assertEq(fiatDepositWalletBalanceAfter - fiatDepositWalletBalanceBefore, netAmount, "Deposit wallet should receive correct maximum amount");
        
        console.log("Withdraw token to fiat successful - maximum amount");
    }

    function test_withdrawTokenToFiat_InvalidDepositWallet() public {
        console.log("=== Test: Withdraw Token To Fiat - Invalid Deposit Wallet ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Try to withdraw with zero address (invalid deposit wallet)
        vm.startPrank(alice);
        vm.expectRevert("Invalid deposit wallet address");
        escrowContract.withdrawTokenToFiat(escrowId, 10 * 10**6, address(0));
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - invalid deposit wallet address");
        console.log("Withdraw token to fiat test successful - invalid deposit wallet");
    }

    function test_withdrawTokenToFiat_ZeroAmount() public {
        console.log("=== Test: Withdraw Token To Fiat - Zero Amount ===");
        
        // Create escrow without vesting
        address[] memory receivers = new address[](1);
        receivers[0] = alice;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**6; // 100 USDT
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDT),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting duration
        );
        
        // Top up funds
        vm.startPrank(owner);
        mockUSDT.approve(address(escrowContract), 100 * 10**6);
        escrowContract.topUpFunds(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        // Generate deposit wallet address
        address fiatDepositWallet = makeAddr("fiatDepositWallet");
        
        // Try to withdraw zero amount
        vm.startPrank(alice);
        vm.expectRevert("Amount must be greater than 0");
        escrowContract.withdrawTokenToFiat(escrowId, 0, fiatDepositWallet);
        vm.stopPrank();
        
        console.log("Withdraw failed as expected - zero amount");
        console.log("Withdraw token to fiat test successful - zero amount");
    }

    function test_ReceiverCanClaimAgainAfterAllClaimedAndTopUp_SameAllocations() public {
        console.log("=== Test: Receiver Can Claim Again After All Claimed and Top-Up - Same Allocations ===");
        
        // Create escrow without vesting with 2 receivers
        address[] memory receivers = new address[](2);
        receivers[0] = alice;
        receivers[1] = bob;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**6; // 100 USDC
        amounts[1] = 200 * 10**6; // 200 USDC
        
        bytes32 escrowId = createTestEscrow(
            address(mockUSDC),
            receivers,
            amounts,
            0, // No vesting
            0  // No vesting
        );
        
        // === STEP 1: Initial top-up and claim all tokens ===
        console.log("Step 1: Initial top-up and claim all tokens");
        
        // Top up initial funds
        vm.startPrank(owner);
        mockUSDC.approve(address(escrowContract), 300 * 10**6);
        escrowContract.topUpFunds(escrowId, 300 * 10**6);
        vm.stopPrank();
        
        // Both receivers claim all their tokens
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 200 * 10**6);
        vm.stopPrank();
        
        // Verify all tokens are claimed
        (,,,uint256 totalDepositedAmountBefore,uint256 totalWithdrawnAmountBefore,uint256 availableBalanceBefore,,,,,) = escrowContract.getEscrowDetails(escrowId);
        assertEq(totalWithdrawnAmountBefore, 300 * 10**6, "All tokens should be claimed");
        assertEq(availableBalanceBefore, 0, "Available balance should be 0");
        
        console.log("All tokens claimed successfully");
        console.log("Total deposited:", totalDepositedAmountBefore);
        console.log("Total withdrawn:", totalWithdrawnAmountBefore);
        console.log("Available balance:", availableBalanceBefore);
        
        // === STEP 2: Second top-up with same allocations ===
        console.log("Step 2: Second top-up with same allocations");
        
        uint256 topUpAmount = 300 * 10**6; // Same as total allocation
        vm.startPrank(owner);
        mockUSDC.approve(address(escrowContract), topUpAmount);
        escrowContract.topUpFunds(escrowId, topUpAmount);
        vm.stopPrank();
        
        // Check state after second top-up
        (,,,uint256 totalDepositedAmountAfter,,uint256 availableBalanceAfter,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        // Verify top-up was successful
        assertEq(totalDepositedAmountAfter, totalDepositedAmountBefore + topUpAmount, "Total deposited amount should increase by top-up amount");
        assertEq(availableBalanceAfter, availableBalanceBefore + topUpAmount, "Available balance should increase by top-up amount");
        
        // Verify receiver allocations remain the same and withdrawn amounts are reset
        (uint256 aliceAllocation, uint256 aliceWithdrawn, bool aliceActive) = escrowContract.getReceiverDetails(escrowId, alice);
        (uint256 bobAllocation, uint256 bobWithdrawn, bool bobActive) = escrowContract.getReceiverDetails(escrowId, bob);
        
        console.log("After second top-up:");
        console.log("Alice allocation:", aliceAllocation);
        console.log("Alice withdrawn:", aliceWithdrawn);
        console.log("Bob allocation:", bobAllocation);
        console.log("Bob withdrawn:", bobWithdrawn);
        console.log("Total deposited amount:", totalDepositedAmountAfter);
        console.log("Available balance:", availableBalanceAfter);
        
        // Verify allocations remain the same
        assertEq(aliceAllocation, 100 * 10**6, "Alice's allocation should remain 100 USDC");
        assertEq(bobAllocation, 200 * 10**6, "Bob's allocation should remain 200 USDC");
        
        // Verify withdrawn amounts are reset to 0
        assertEq(aliceWithdrawn, 0, "Alice's withdrawn amount should be reset to 0");
        assertEq(bobWithdrawn, 0, "Bob's withdrawn amount should be reset to 0");
        
        // Verify receivers are still active
        assertTrue(aliceActive, "Alice should be active");
        assertTrue(bobActive, "Bob should be active");
        
        // === STEP 3: Receivers claim again with same allocations ===
        console.log("Step 3: Receivers claim again with same allocations");
        
        // Alice claims her allocation again
        uint256 aliceBalanceBefore = mockUSDC.balanceOf(alice);
        vm.startPrank(alice);
        escrowContract.withdrawTokenToCrypto(escrowId, 100 * 10**6);
        vm.stopPrank();
        uint256 aliceBalanceAfter = mockUSDC.balanceOf(alice);
        
        // Bob claims his allocation again
        uint256 bobBalanceBefore = mockUSDC.balanceOf(bob);
        vm.startPrank(bob);
        escrowContract.withdrawTokenToCrypto(escrowId, 200 * 10**6);
        vm.stopPrank();
        uint256 bobBalanceAfter = mockUSDC.balanceOf(bob);
        
        // Verify Alice received her tokens (minus fee)
        uint256 expectedAliceNetAmount = 100 * 10**6 - (100 * 10**6 * PLATFORM_FEE_BPS / 10000);
        assertEq(aliceBalanceAfter - aliceBalanceBefore, expectedAliceNetAmount, "Alice should receive her allocation minus fee");
        
        // Verify Bob received his tokens (minus fee)
        uint256 expectedBobNetAmount = 200 * 10**6 - (200 * 10**6 * PLATFORM_FEE_BPS / 10000);
        assertEq(bobBalanceAfter - bobBalanceBefore, expectedBobNetAmount, "Bob should receive his allocation minus fee");
        
        // Verify final state
        (,,,uint256 finalTotalDeposited,uint256 finalTotalWithdrawn,uint256 finalAvailableBalance,,,,,) = escrowContract.getEscrowDetails(escrowId);
        
        console.log("Final state after second claim:");
        console.log("Total deposited:", finalTotalDeposited);
        console.log("Total withdrawn:", finalTotalWithdrawn);
        console.log("Available balance:", finalAvailableBalance);
        
        // Verify all tokens are claimed again
        // Note: totalWithdrawnAmount is reset to 0 when all tokens are claimed and new cycle starts
        // So after second claim, it should be 300 USDC (not 600 USDC)
        assertEq(finalTotalWithdrawn, 300 * 10**6, "Total withdrawn should be 300 USDC (current cycle only)");
        assertEq(finalAvailableBalance, 0, "Available balance should be 0 again");
        
        console.log("SUCCESS: Receivers can claim again with same allocations after all tokens claimed and top-up!");
    }

}