import { OperationType, TransacaoCompleta, TransactionLinks, TransactionMeta } from "@/types/finance";

export type FormState = {
  accountId: string;
  date: string;
  amount: string;
  operationType: OperationType | null;
  categoryId: string | null;
  description: string;
  destinationAccountId: string | null;
  tempInvestmentId: string | null;
  tempLoanId: string | null;
  tempParcelaId: string | null;
  tempVehicleOperation: 'compra' | 'venda' | null;
  tempVehicleId: string | null;
  tempSeguroId: string | null;
  tempSeguroParcelaId: string | null;
  tempAssetType: 'imovel' | 'terreno' | null;
  tempAssetId: string | null;
  tempAssetOperation: 'compra' | 'venda' | null;
  newVehicleData: { modelo: string; tipo: 'carro' | 'moto' | 'caminhao'; marca?: string; ano: number };
  newImovelData: { descricao: string; tipo: 'casa' | 'apartamento' | 'comercial'; endereco: string };
  newTerrenoData: { descricao: string; endereco: string };
  discountAmount: string;
};

export type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'RESET'; payload: Partial<FormState> }
  | { type: 'SET_OPERATION'; operationType: OperationType };

export const initialState: FormState = {
  accountId: "",
  date: new Date().toISOString().split('T')[0],
  amount: "0,00",
  operationType: 'despesa',
  categoryId: null,
  description: "",
  destinationAccountId: null,
  tempInvestmentId: null,
  tempLoanId: null,
  tempParcelaId: null,
  tempVehicleOperation: null,
  tempVehicleId: null,
  tempSeguroId: null,
  tempSeguroParcelaId: null,
  tempAssetType: null,
  tempAssetId: null,
  tempAssetOperation: null,
  newVehicleData: { modelo: '', tipo: 'carro', marca: '', ano: new Date().getFullYear() },
  newImovelData: { descricao: '', tipo: 'casa', endereco: '' },
  newTerrenoData: { descricao: '', endereco: '' },
  discountAmount: "0,00",
};

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_OPERATION':
      return {
        ...initialState,
        operationType: action.operationType,
        accountId: state.accountId,
        date: state.date,
        amount: state.amount,
      };

    case 'RESET':
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}
