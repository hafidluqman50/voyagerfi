// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library MathLib {
    uint256 internal constant PRECISION = 1e18;

    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        return (a * b) / denominator;
    }

    function abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
