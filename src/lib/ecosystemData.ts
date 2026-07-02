export interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  tags: string[];
  link: string;
}

export interface MatchAgent {
  id: string;
  name: string;
  specialty: string;
  description: string;
  initialMessage: string;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  location: string;
  highlights: string[];
}

export const ARTICLES: Article[] = [
  {
    id: 'nbr-15575',
    title: 'NBR 15575: O Guia Completo da Norma de Desempenho',
    category: 'Normas Técnicas',
    readTime: '6 min',
    summary: 'Entenda os critérios mínimos de segurança, estabilidade e conforto térmico-acústico em edificações residenciais.',
    tags: ['Normas Técnicas', 'Engenharia', 'Legislação'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'cura-concreto',
    title: 'Cura do Concreto: Como Evitar Fissuras e Trincas Estruturais',
    category: 'Patologias',
    readTime: '5 min',
    summary: 'Aprenda sobre o tempo ideal de cura úmida e os cuidados cruciais durante e após a concretagem de pilares e lajes.',
    tags: ['Concreto', 'Engenharia', 'Patologias'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'fundacoes',
    title: 'Fundações de Obra: Sapatas, Estacas e Blocos de Fundação',
    category: 'Engenharia',
    readTime: '8 min',
    summary: 'Como ler o ensaio SPT do solo e definir a infraestrutura mais segura e econômica para a sua obra.',
    tags: ['Fundações', 'Engenharia Civil', 'Estruturas'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'custos-material',
    title: 'Métodos para Redução de Desperdício de Materiais na Obra',
    category: 'Custos',
    readTime: '4 min',
    summary: 'Planilhas de perdas de aço e cubagem de concreto para manter o orçamento da construção rigorosamente sob controle.',
    tags: ['Custos', 'Orçamentos', 'Gestão'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'impermeabilizacao',
    title: 'Impermeabilização Definitiva de Baldrames e Lajes',
    category: 'Reformas',
    readTime: '7 min',
    summary: 'Comparativo técnico entre manta asfáltica, argamassa polimérica e aditivos hidrofugantes para evitar umidade ascendente.',
    tags: ['Infiltrações', 'Impermeabilização', 'Reformas'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'tecnologia',
    title: 'O Impacto dos Diários Digitais na Produtividade e Segurança Jurídica',
    category: 'Tecnologia na Construção',
    readTime: '5 min',
    summary: 'Como a coleta de dados de clima, fotos e assinaturas previne pleitos judiciais e agiliza a entrega das chaves.',
    tags: ['Tecnologia', 'Gestão de Obras', 'Laudos'],
    link: 'https://obramatchof.blogspot.com/'
  },
  {
    id: 'dicas-gesso',
    title: 'Drywall vs. Alvenaria Convencional: Custos e Desempenho',
    category: 'Dicas para Construção',
    readTime: '6 min',
    summary: 'Análise detalhada de isolamento térmico, tempo de montagem e custos por metro quadrado em divisórias internas.',
    tags: ['Dicas para Construção', 'Reformas', 'Custos'],
    link: 'https://obramatchof.blogspot.com/'
  }
];

export const AGENTS: MatchAgent[] = [
  {
    id: 'normas',
    name: 'Normas Técnicas (NBR)',
    specialty: 'ABNT & Desempenho',
    description: 'Especialista em normas regulamentadoras NBR, acessibilidade, segurança e desempenho construtivo.',
    initialMessage: 'Olá! Sou seu assistente de Normas Técnicas. Pode me consultar sobre NBR 15575, NBR 9050 ou qualquer outra regulamentação da ABNT.'
  },
  {
    id: 'engenharia',
    name: 'Engenharia Civil',
    specialty: 'Métodos & Materiais',
    description: 'Auxilia nas melhores práticas executivas, dosagem de concreto, traço de argamassa e materiais.',
    initialMessage: 'Olá! Sou especialista em engenharia de campo. Como posso ajudar nas especificações dos materiais ou controle de qualidade hoje?'
  },
  {
    id: 'estruturas',
    name: 'Cálculo de Estruturas',
    specialty: 'Fundações & Superestrutura',
    description: 'Consultas sobre ferragens, armaduras, sapatas, estacas e dimensionamento de vigas e lajes.',
    initialMessage: 'Olá! Sou o especialista estrutural. Tem alguma dúvida técnica sobre dimensionamento, cobrimento de armadura ou carregamentos?'
  },
  {
    id: 'arquitetura',
    name: 'Arquitetura & Layout',
    specialty: 'Fluxos & Ergonomia',
    description: 'Sugestões de layout, detalhamento técnico, paginação de revestimentos e funcionalidade dos espaços.',
    initialMessage: 'Olá! Posso auxiliar com detalhes de projeto de arquitetura, ergonomia, fluxos espaciais e especificações de acabamento.'
  },
  {
    id: 'orcamentos',
    name: 'Orçamentos & Custos',
    specialty: 'SINAPI & Estimativas',
    description: 'Auxílio em composições de custo unitário, insumos, levantamentos quantitativos e curvas ABC.',
    initialMessage: 'Olá! Sou especialista em custos. Vamos analisar planilhas de insumos, cotações de preços ou cronogramas físico-financeiros?'
  },
  {
    id: 'patologias',
    name: 'Laudos & Patologias',
    specialty: 'Manifestações Patológicas',
    description: 'Diagnóstico técnico de fissuras, infiltrações, recalques de fundação e desagregação de concreto.',
    initialMessage: 'Olá! Sou especialista em patologias da construção. Descreva as trincas ou vazamentos para fazermos um diagnóstico inicial.'
  }
];

export const PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    name: 'Engª. Amanda Medeiros',
    role: 'Engenheira de Estruturas',
    rating: 4.9,
    reviews: 42,
    location: 'Grande São Paulo',
    highlights: ['Especialista em concreto armado', 'Projetos residenciais', 'Experiência de 8 anos']
  },
  {
    id: 'p2',
    name: 'Marcos Roberto Santos',
    role: 'Mestre de Obras Geral',
    rating: 5.0,
    reviews: 58,
    location: 'Rio de Janeiro e Baixada',
    highlights: ['Especialista em fundações', 'Excelente controle de equipe', 'Pontualidade comprovada']
  },
  {
    id: 'p3',
    name: 'Gesso & Cia Decorações',
    role: 'Empreiteiro de Acabamento',
    rating: 4.8,
    reviews: 31,
    location: 'Belo Horizonte',
    highlights: ['Drywall de alto padrão', 'Pintura mecanizada', 'Orçamento transparente']
  },
  {
    id: 'p4',
    name: 'Satec Impermeabilizações',
    role: 'Especialista em Infiltrações',
    rating: 4.9,
    reviews: 25,
    location: 'Curitiba e Região',
    highlights: ['Garantia de 5 anos', 'Tecnologia de injeção química', 'Laudo técnico']
  }
];

export interface Recommendation {
  stageName: string;
  article: Article;
  agent: MatchAgent;
  professional: Professional;
}

export function getContextualRecommendations(text: string): Recommendation {
  const lowercase = text.toLowerCase();
  
  let articleId = 'nbr-15575'; // default
  let agentId = 'normas';      // default
  let professionalId = 'p1';   // default
  let stageName = 'Normas & Planejamento'; // default

  if (lowercase.includes('concreto') || lowercase.includes('laje') || lowercase.includes('pilar') || lowercase.includes('viga') || lowercase.includes('cura')) {
    articleId = 'cura-concreto';
    agentId = 'estruturas';
    professionalId = 'p2';
    stageName = 'Estruturas & Superestrutura';
  } else if (lowercase.includes('fundação') || lowercase.includes('sapata') || lowercase.includes('bloco') || lowercase.includes('estaca') || lowercase.includes('solo') || lowercase.includes('escavação')) {
    articleId = 'fundacoes';
    agentId = 'estruturas';
    professionalId = 'p2';
    stageName = 'Fundações & Infraestrutura';
  } else if (lowercase.includes('infiltração') || lowercase.includes('infiltracao') || lowercase.includes('umidade') || lowercase.includes('vazamento') || lowercase.includes('goteira') || lowercase.includes('impermeabilizacao') || lowercase.includes('impermeabilização')) {
    articleId = 'impermeabilizacao';
    agentId = 'patologias';
    professionalId = 'p4';
    stageName = 'Impermeabilização e Proteção';
  } else if (lowercase.includes('custo') || lowercase.includes('orçamento') || lowercase.includes('gasto') || lowercase.includes('preço') || lowercase.includes('compras') || lowercase.includes('insumo')) {
    articleId = 'custos-material';
    agentId = 'orcamentos';
    professionalId = 'p3';
    stageName = 'Planejamento & Custos';
  } else if (lowercase.includes('gesso') || lowercase.includes('drywall') || lowercase.includes('pintura') || lowercase.includes('revestimento') || lowercase.includes('acabamento')) {
    articleId = 'dicas-gesso';
    agentId = 'arquitetura';
    professionalId = 'p3';
    stageName = 'Revestimento & Acabamentos';
  } else if (lowercase.includes('tecnologia') || lowercase.includes('sistema') || lowercase.includes('digital') || lowercase.includes('laudo') || lowercase.includes('projeto') || lowercase.includes('crea') || lowercase.includes('cau')) {
    articleId = 'tecnologia';
    agentId = 'normas';
    professionalId = 'p1';
    stageName = 'Legalização & Segurança Jurídica';
  }

  return {
    stageName,
    article: ARTICLES.find(a => a.id === articleId) || ARTICLES[0],
    agent: AGENTS.find(a => a.id === agentId) || AGENTS[0],
    professional: PROFESSIONALS.find(p => p.id === professionalId) || PROFESSIONALS[0]
  };
}
