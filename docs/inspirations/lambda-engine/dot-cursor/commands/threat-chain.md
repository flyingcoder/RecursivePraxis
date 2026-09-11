# /threat-chain Command - Blockchain Threat Modeler

## Description

Creates threat models for blockchain systems including smart contracts, DeFi, and Web3 applications. Uses controlled rupture operators to ensure comprehensive blockchain security.

## Usage

```bash
/threat-chain <system>
/threat-chain model: <description>
/threat-chain audit: <contract>
```

**Parameters:**

- `model: <description>`: Create threat model
- `audit: <contract>`: Audit smart contract

## What It Does

Applies controlled rupture operators:
- **Para** (∥): Explore blockchain attack vectors
- **Non** (¬): Negate security assumptions
- **Ortho** (⊥): Validate security
- **Weave** (🕸️): Integrate mitigations

## Examples

```bash
/threat-chain model: DeFi protocol
/threat-chain audit: TokenContract.sol
```

## Output

Provides:
- Blockchain threat model
- Smart contract vulnerabilities
- DeFi risks
- Mitigation strategies
- Audit recommendations

## When to Use

- Blockchain security
- Smart contract audits
- DeFi security
- Web3 applications

## Related

- Use `/threat` for general threat modeling
- Use `/gas` for gas optimization
