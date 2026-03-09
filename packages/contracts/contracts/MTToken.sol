// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MTToken
 * @dev MintLearn 平台原生代币（MT）
 * 初始发行量 10 亿枚，全部 mint 给 owner
 * owner 可追加 mint，支持任意用户 burn 自己的代币
 */
contract MTToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    constructor(address initialOwner) ERC20("MintLearn Token", "MT") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev 追加 mint（仅 owner，用于平台运营激励）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 销毁自己的代币
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
