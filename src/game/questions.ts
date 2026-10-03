import type { Question } from "@/game/types";

export const QUESTIONS: Question[] = [
  {
    id: 1,
    prompt: "What does RLNC stand for?",
    choices: [
      "Random Linear Network Coding",
      "Rapid Layer Node Connection",
      "Redundant Link Network Cache",
      "Real-time Ledger Node Control",
    ],
    correct: 0,
  },
  {
    id: 2,
    prompt: "Who is the co-founder and CEO of Optimum?",
    choices: ["Vitalik Buterin", "Muriel Médard", "Gavin Wood", "Silvio Micali"],
    correct: 1,
  },
  {
    id: 3,
    prompt: "What is OptimumP2P?",
    choices: [
      "A new blockchain consensus mechanism",
      "A chain-agnostic data propagation protocol",
      "A token swap protocol",
      "A wallet infrastructure tool",
    ],
    correct: 1,
  },
  {
    id: 4,
    prompt: "What is mump2p?",
    choices: [
      "Optimum's Ethereum-specific implementation of its propagation protocol",
      "A mobile wallet app",
      "A Layer 2 rollup",
      "A validator staking pool",
    ],
    correct: 0,
  },
  {
    id: 5,
    prompt: "What does DeRAM provide to the network?",
    choices: [
      "Decentralized identity verification",
      "A decentralized RAM layer ensuring atomicity, consistency, and durability",
      "A decentralized exchange",
      "A token bridge",
    ],
    correct: 1,
  },
  {
    id: 6,
    prompt: "What are Flexnodes?",
    choices: [
      "Validator-only nodes requiring large stake",
      "Permissionless nodes any internet-connected device can run",
      "Nodes exclusive to Ethereum",
      "Nodes that only store archived data",
    ],
    correct: 1,
  },
  {
    id: 7,
    prompt: "What is the Latency Marketplace?",
    choices: [
      "A place to trade NFTs quickly",
      "A system rewarding nodes for useful work and bandwidth contributed",
      "A validator staking exchange",
      "A token launchpad",
    ],
    correct: 1,
  },
  {
    id: 8,
    prompt: "Approximately how fast is mump2p's average block propagation in testnet conditions?",
    choices: ["1000ms", "500ms", "150ms", "10ms"],
    correct: 2,
  },
  {
    id: 9,
    prompt: "How much faster is mump2p than the Gossipsub baseline in testing?",
    choices: ["2x", "6x", "10x", "20x"],
    correct: 1,
  },
  {
    id: 10,
    prompt: "Does Optimum process transactions or run consensus?",
    choices: [
      "Yes, it is a full Layer 1 blockchain",
      "No, it is an additive infrastructure layer alongside existing chains",
      "Only for Ethereum",
      "Only during high congestion",
    ],
    correct: 1,
  },
  {
    id: 11,
    prompt: "What was the size of Optimum's seed funding round?",
    choices: ["$5 million", "$11 million", "$25 million", "$50 million"],
    correct: 1,
  },
  {
    id: 12,
    prompt: "Which firm led Optimum's seed round?",
    choices: ["Paradigm", "a16z", "1kx", "Sequoia"],
    correct: 2,
  },
  {
    id: 13,
    prompt: "What academic/research background does Optimum's tech come from?",
    choices: [
      "20+ years of MIT research used in 5G, satellite, and IoT",
      "A university blockchain hackathon",
      "A government research grant from 2020",
      "An open-source Discord community project",
    ],
    correct: 0,
  },
  {
    id: 14,
    prompt: "What does Optimum call its node operator onboarding program?",
    choices: ["Genesis Program", "Hacknets", "Launchpad", "Node Academy"],
    correct: 1,
  },
  {
    id: 15,
    prompt: "What chains can OptimumP2P work with?",
    choices: [
      "Only Ethereum",
      "Only Solana",
      "Chain-agnostic — EVM, SVM, and MoveVM",
      "Only Layer 2s",
    ],
    correct: 2,
  },
  {
    id: 16,
    prompt: "Which of these is NOT something Optimum requires to function?",
    choices: [
      "Validator key access",
      "Chain-agnostic compatibility",
      "Flexnodes",
      "A propagation layer",
    ],
    correct: 0,
  },
  {
    id: 17,
    prompt: "What real-world problem does Optimum primarily solve?",
    choices: [
      "Smart contract security",
      "Data propagation speed across the network",
      "Wallet custody",
      "NFT royalty enforcement",
    ],
    correct: 1,
  },
  {
    id: 18,
    prompt: "On which Ethereum testnet has Optimum run trials?",
    choices: ["Sepolia", "Goerli", "Hoodi", "Holesky"],
    correct: 2,
  },
  {
    id: 19,
    prompt: "What percentage of Ethereum's total stake did Optimum's testnet validator partners represent?",
    choices: ["5%", "15%", "30%", "50%"],
    correct: 1,
  },
  {
    id: 20,
    prompt: "What is the core theme behind Optimum's entire mission?",
    choices: [
      "Lowering gas fees",
      "Reducing latency and improving network utility",
      "Building new Layer 2 rollups",
      "Creating new token standards",
    ],
    correct: 1,
  },
];

export function shuffle<T>(list: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

export function pickQuestions(rand: () => number = Math.random): Question[] {
  return shuffle(QUESTIONS, rand).slice(0, 5);
}
