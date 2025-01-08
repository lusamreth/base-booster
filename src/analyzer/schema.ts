
export interface AnalysisResult {
    dependencies: DependencyDetail[];
    statusCodes: number[];
    usesNodeApis: boolean;
}

export interface DependencyDetail {
    module: string;
    specifiers: string[];
    type: 'Internal' | 'External';
    kind?: "require" | "import"
}

export type TypeInjectMod = {
    text: string;
    path: string;
    pos: number;
};

