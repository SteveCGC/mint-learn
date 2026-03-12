// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ICourseManagerLike {
    function purchaseCourse(uint256 courseId) external;
}

contract ReentrantToken is ERC20 {
    ICourseManagerLike public target;
    uint256 public reentryCourseId;
    bool private _shouldReenter;

    constructor() ERC20("Reentrant Token", "RMT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setReentry(address _target, uint256 _reentryCourseId) external {
        target = ICourseManagerLike(_target);
        reentryCourseId = _reentryCourseId;
        _shouldReenter = true;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (_shouldReenter) {
            _shouldReenter = false;
            target.purchaseCourse(reentryCourseId);
        }

        return super.transferFrom(from, to, value);
    }
}
