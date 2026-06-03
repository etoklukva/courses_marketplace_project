import { ethers } from "ethers";
import { STUDY_TOKEN_ABI } from "../abi/StudyToken";
import { COURSE_MARKETPLACE_ABI } from "../abi/CourseMarketplace";
import {
  STUDY_TOKEN_ADDRESS,
  COURSE_MARKETPLACE_ADDRESS
} from "../config/contracts";

export async function getBlockchain() {
  if (!window.ethereum) {
    throw new Error("MetaMask не установлен");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  const tokenContract = new ethers.Contract(
    STUDY_TOKEN_ADDRESS,
    STUDY_TOKEN_ABI,
    signer
  );

  const marketplaceContract = new ethers.Contract(
    COURSE_MARKETPLACE_ADDRESS,
    COURSE_MARKETPLACE_ABI,
    signer
  );

  return {
    provider,
    signer,
    userAddress,
    tokenContract,
    marketplaceContract
  };
}

export function formatToken(amount) {
  return ethers.formatUnits(amount, 18);
}

export function parseToken(amount) {
  return ethers.parseUnits(amount, 18);
}