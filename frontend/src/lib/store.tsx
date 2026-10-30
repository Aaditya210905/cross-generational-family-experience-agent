/**
 * FamilyFusion AI — Family State Store
 *
 * Global state management for the family-in-progress using React Context.
 * Person A owns this file. Person B should request new fields through A.
 */

"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type {
  FamilyMember,
  CategoryType,
  ConstraintConfig,
  GenerationLabel,
  ResolvedProfile,
} from "./types";

// ── State ────────────────────────────────────────────────────────────────────

interface FamilyState {
  members: FamilyMember[];
  category: CategoryType;
  constraints: ConstraintConfig;
  currentStep: number; // 0=welcome, 1=members, 2=preferences, 3=constraints, 4=results
  isLoading: boolean;
  error: string | null;
  resolutionProfile: ResolvedProfile | null;
}

const initialConstraints: ConstraintConfig = {
  budget: "any",
  at_home: false,
  energy_level: "any",
  dietary_restrictions: [],
};

const initialState: FamilyState = {
  members: [],
  category: "movies",
  constraints: initialConstraints,
  currentStep: 0,
  isLoading: false,
  error: null,
  resolutionProfile: null,
};

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "ADD_MEMBER"; member: FamilyMember }
  | { type: "REMOVE_MEMBER"; memberId: string }
  | { type: "UPDATE_MEMBER"; member: FamilyMember }
  | { type: "SET_CATEGORY"; category: CategoryType }
  | { type: "SET_CONSTRAINTS"; constraints: ConstraintConfig }
  | { type: "SET_MEMBERS"; members: FamilyMember[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_RESOLUTION"; profile: ResolvedProfile | null }
  | { type: "RESET" }
  | { type: "LOAD_DEMO"; members: FamilyMember[]; category: CategoryType };

function reducer(state: FamilyState, action: Action): FamilyState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
    case "ADD_MEMBER":
      return { ...state, members: [...state.members, action.member] };
    case "REMOVE_MEMBER":
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.memberId),
      };
    case "UPDATE_MEMBER":
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.member.id ? action.member : m,
        ),
      };
    case "SET_CATEGORY":
      return { ...state, category: action.category };
    case "SET_CONSTRAINTS":
      return { ...state, constraints: action.constraints };
    case "SET_MEMBERS":
      return { ...state, members: action.members };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_RESOLUTION":
      return { ...state, resolutionProfile: action.profile };
    case "RESET":
      return initialState;
    case "LOAD_DEMO":
      return {
        ...state,
        members: action.members,
        category: action.category,
        currentStep: 1,
        error: null,
      };
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

interface FamilyContextType {
  state: FamilyState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  addMember: (nickname: string, generation: GenerationLabel) => void;
  removeMember: (id: string) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addMember = (nickname: string, generation: GenerationLabel) => {
    const member: FamilyMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nickname,
      generation,
      liked_items: [],
      disliked_items: [],
    };
    dispatch({ type: "ADD_MEMBER", member });
  };

  const removeMember = (id: string) => {
    dispatch({ type: "REMOVE_MEMBER", memberId: id });
  };

  const goToStep = (step: number) => {
    dispatch({ type: "SET_STEP", step });
  };

  const nextStep = () => {
    dispatch({ type: "SET_STEP", step: Math.min(state.currentStep + 1, 4) });
  };

  const prevStep = () => {
    dispatch({ type: "SET_STEP", step: Math.max(state.currentStep - 1, 0) });
  };

  return (
    <FamilyContext.Provider
      value={{ state, dispatch, addMember, removeMember, goToStep, nextStep, prevStep }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyState() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamilyState must be used within a FamilyProvider");
  }
  return context;
}
