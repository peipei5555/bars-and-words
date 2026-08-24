/* ともやの家 — Immersion Learning MVP（既存の自然音声付き英文を再利用） */
'use strict';

const IMMERSION_LESSONS = [
  {
    id: 'immersion-blender-camera', topicId: 'blender-camera', level: 'A1-A2',
    priority: 1, modes: ['commute', 'quick', 'free'],
    tags: { topics: ['blender', '3d'], vocabulary: ['wide', 'nearby', 'distance', 'story'], grammar: ['can', 'svoc'], foundation: ['daily', 'toeic'] },
    sentences: [
      { id: 'blender-camera-1', en: 'A wide lens can make nearby objects feel larger.', ja: '広角レンズは、近くの物をより大きく感じさせることがあります。',
        chunks: [{t:'A wide lens',role:'S',ja:'広角レンズは'},{t:'can make',role:'V',ja:'〜させることができる'},{t:'nearby objects',role:'O',ja:'近くの物を'},{t:'feel larger',role:'C',ja:'より大きく感じる状態に'}],
        point:'make A B は「AをBの状態にする」。ここではレンズが物の見え方を変えています。' },
      { id: 'blender-camera-2', en: 'A long lens makes distance look flatter.', ja: '望遠レンズは、距離をより平たく見せます。',
        chunks: [{t:'A long lens',role:'S',ja:'望遠レンズは'},{t:'makes',role:'V',ja:'〜させる'},{t:'distance',role:'O',ja:'距離を'},{t:'look flatter',role:'C',ja:'より平たく見える状態に'}],
        point:'主語が単数なので make に s が付きます。look + 形容詞で「〜に見える」です。' },
      { id: 'blender-camera-3', en: 'The model stays the same, but the story changes.', ja: 'モデルは同じままですが、物語は変わります。',
        chunks: [{t:'The model',role:'S',ja:'モデルは'},{t:'stays',role:'V',ja:'〜のままでいる'},{t:'the same',role:'C',ja:'同じ状態'},{t:'but',role:'conj',ja:'しかし'},{t:'the story',role:'S',ja:'物語は'},{t:'changes',role:'V',ja:'変わる'}],
        point:'but で対照的な2文をつないでいます。stay + 形容詞は「〜のままでいる」です。' },
    ],
    production: [
      {id:'blender-camera-p1',ja:'広角レンズは、近くの物をより大きく感じさせることがあります。',answer:'A wide lens can make nearby objects feel larger.',source:'blender-camera-1'},
      {id:'blender-camera-p2',ja:'望遠レンズは、距離をより平たく見せます。',answer:'A long lens makes distance look flatter.',source:'blender-camera-2'},
      {id:'blender-camera-p3',ja:'モデルは同じままですが、物語は変わります。',answer:'The model stays the same, but the story changes.',source:'blender-camera-3'},
    ],
  },
  {
    id: 'immersion-ai-judgment', topicId: 'ai-judgment', level: 'A1-A2',
    priority: 2, modes: ['commute', 'quick', 'free'],
    tags: { topics: ['ai'], vocabulary: ['option', 'answer', 'judgment', 'matter'], grammar: ['can', 'comparative', 'passive'], foundation: ['daily', 'toeic'] },
    sentences: [
      { id:'ai-judgment-1', en:'AI can create many options in a short time.', ja:'AIは短い時間で多くの選択肢を作れます。',
        chunks:[{t:'AI',role:'S',ja:'AIは'},{t:'can create',role:'V',ja:'作ることができる'},{t:'many options',role:'O',ja:'多くの選択肢を'},{t:'in a short time',role:'M',ja:'短時間で'}], point:'can + 動詞の原形で「〜できる」。in a short time は時間の短さを足します。' },
      { id:'ai-judgment-2', en:'More options do not always mean a better answer.', ja:'選択肢が多くても、必ず良い答えになるとは限りません。',
        chunks:[{t:'More options',role:'S',ja:'より多くの選択肢は'},{t:'do not always mean',role:'V',ja:'必ずしも意味しない'},{t:'a better answer',role:'O',ja:'より良い答えを'}], point:'not always は「いつも〜ではない」ではなく「必ずしも〜とは限らない」です。' },
      { id:'ai-judgment-3', en:'Human judgment is still needed to choose what matters.', ja:'何が重要かを選ぶには、今も人の判断が必要です。',
        chunks:[{t:'Human judgment',role:'S',ja:'人の判断が'},{t:'is needed',role:'V',ja:'必要とされる'},{t:'still',role:'M',ja:'今も'},{t:'to choose what matters',role:'M',ja:'何が重要かを選ぶために'}], point:'is needed は受け身で「必要とされる」。to choose は目的を説明します。' },
    ],
    production:[
      {id:'ai-judgment-p1',ja:'AIは短い時間で多くの選択肢を作れます。',answer:'AI can create many options in a short time.',source:'ai-judgment-1'},
      {id:'ai-judgment-p2',ja:'選択肢が多くても、必ず良い答えになるとは限りません。',answer:'More options do not always mean a better answer.',source:'ai-judgment-2'},
      {id:'ai-judgment-p3',ja:'何が重要かを選ぶには、今も人の判断が必要です。',answer:'Human judgment is still needed to choose what matters.',source:'ai-judgment-3'},
    ],
  },
  {
    id:'immersion-art-space', topicId:'art-negative-space', level:'A1-A2', priority:3, modes:['commute','quick','free'],
    tags:{topics:['art','design'],vocabulary:['empty','subject','negative space','expensive'],grammar:['svoc','can'],foundation:['daily','toeic']},
    sentences:[
      {id:'art-space-1',en:'Empty space helps us see the main subject.',ja:'余白は、主役を見やすくしてくれます。',chunks:[{t:'Empty space',role:'S',ja:'余白は'},{t:'helps',role:'V',ja:'助ける'},{t:'us',role:'O',ja:'私たちが'},{t:'see the main subject',role:'C',ja:'主役を見ることを'}],point:'help A do は「Aが〜するのを助ける」。do の前に to を置かない形も自然です。'},
      {id:'art-space-2',en:'Designers call this negative space.',ja:'デザイナーはこれをネガティブスペースと呼びます。',chunks:[{t:'Designers',role:'S',ja:'デザイナーは'},{t:'call',role:'V',ja:'呼ぶ'},{t:'this',role:'O',ja:'これを'},{t:'negative space',role:'C',ja:'ネガティブスペースと'}],point:'call A B は「AをBと呼ぶ」。as は入れません。'},
      {id:'art-space-3',en:'It can make a poster feel quiet, strong, or expensive.',ja:'それはポスターを、静かで、力強く、高価な印象にできます。',chunks:[{t:'It',role:'S',ja:'それは'},{t:'can make',role:'V',ja:'〜させられる'},{t:'a poster',role:'O',ja:'ポスターを'},{t:'feel quiet, strong, or expensive',role:'C',ja:'静かで、強く、高価に感じる状態に'}],point:'形容詞をコンマと or で並べ、複数の印象を一度に説明しています。'},
    ],
    production:[
      {id:'art-space-p1',ja:'余白は、主役を見やすくしてくれます。',answer:'Empty space helps us see the main subject.',source:'art-space-1'},
      {id:'art-space-p2',ja:'デザイナーはこれをネガティブスペースと呼びます。',answer:'Designers call this negative space.',source:'art-space-2'},
      {id:'art-space-p3',ja:'それはポスターを、静かで、力強く、高価な印象にできます。',answer:'It can make a poster feel quiet, strong, or expensive.',source:'art-space-3'},
    ],
  },
  {
    id:'immersion-leather-patina', topicId:'leather-patina', level:'A1-A2', priority:4, modes:['commute','quick','free'],
    tags:{topics:['leather'],vocabulary:['vegetable-tanned','patina','care','aging'],grammar:['passive','do-not'],foundation:['daily','toeic']},
    sentences:[
      {id:'leather-patina-1',en:'Vegetable-tanned leather changes with light, oil, and touch.',ja:'タンニン鞣し革は、光、油、手で触れることによって変化します。',chunks:[{t:'Vegetable-tanned leather',role:'S',ja:'タンニン鞣し革は'},{t:'changes',role:'V',ja:'変化する'},{t:'with light, oil, and touch',role:'M',ja:'光、油、接触によって'}],point:'with は道具だけでなく「〜の影響で」という変化の要因も表せます。'},
      {id:'leather-patina-2',en:'These changes are called patina.',ja:'これらの変化はパティーナと呼ばれます。',chunks:[{t:'These changes',role:'S',ja:'これらの変化は'},{t:'are called',role:'V',ja:'〜と呼ばれる'},{t:'patina',role:'C',ja:'パティーナと'}],point:'are called は受け身。「人が呼ぶ」ではなく「〜と呼ばれる」を表します。'},
      {id:'leather-patina-3',en:'Good care does not stop aging; it helps the leather age well.',ja:'良い手入れは経年変化を止めるのではなく、革が良く育つのを助けます。',chunks:[{t:'Good care',role:'S',ja:'良い手入れは'},{t:'does not stop',role:'V',ja:'止めない'},{t:'aging',role:'O',ja:'経年変化を'},{t:'it',role:'S',ja:'それは'},{t:'helps',role:'V',ja:'助ける'},{t:'the leather',role:'O',ja:'革が'},{t:'age well',role:'C',ja:'良く育つことを'}],point:'セミコロンは関係の深い2文をつなぎます。help A do の形も再登場しています。'},
    ],
    production:[
      {id:'leather-patina-p1',ja:'タンニン鞣し革は、光、油、手で触れることによって変化します。',answer:'Vegetable-tanned leather changes with light, oil, and touch.',source:'leather-patina-1'},
      {id:'leather-patina-p2',ja:'これらの変化はパティーナと呼ばれます。',answer:'These changes are called patina.',source:'leather-patina-2'},
      {id:'leather-patina-p3',ja:'良い手入れは経年変化を止めるのではなく、革が良く育つのを助けます。',answer:'Good care does not stop aging; it helps the leather age well.',source:'leather-patina-3'},
    ],
  },
  {
    id:'immersion-shoe-last', topicId:'shoe-last', level:'A1-A2', priority:5, modes:['commute','quick','free'],
    tags:{topics:['shoes','craft'],vocabulary:['last','control','shape','balance'],grammar:['comparative','can'],foundation:['daily','toeic']},
    sentences:[
      {id:'shoe-last-1',en:'A shoe last controls more than size.',ja:'靴のラストが決めるのは、サイズだけではありません。',chunks:[{t:'A shoe last',role:'S',ja:'靴のラストは'},{t:'controls',role:'V',ja:'決める'},{t:'more than size',role:'O',ja:'サイズ以上のことを'}],point:'more than は「〜より多い」だけでなく「〜だけではない」という広がりを表せます。'},
      {id:'shoe-last-2',en:'It shapes the toe, waist, heel, and overall balance.',ja:'それは爪先、ウエスト、踵、全体のバランスを形作ります。',chunks:[{t:'It',role:'S',ja:'それは'},{t:'shapes',role:'V',ja:'形作る'},{t:'the toe, waist, heel, and overall balance',role:'O',ja:'爪先、ウエスト、踵、全体のバランスを'}],point:'shape は名詞の「形」だけでなく、動詞の「形作る」としても使えます。'},
      {id:'shoe-last-3',en:'Two shoes can use similar materials and still feel completely different.',ja:'2足が似た材料を使っていても、印象はまったく違うことがあります。',chunks:[{t:'Two shoes',role:'S',ja:'2足の靴は'},{t:'can use',role:'V',ja:'使うことができる'},{t:'similar materials',role:'O',ja:'似た材料を'},{t:'and still feel',role:'V',ja:'それでも感じられる'},{t:'completely different',role:'C',ja:'まったく違って'}],point:'still はここでは「それでも」。同じ材料と違う印象の対比を作っています。'},
    ],
    production:[
      {id:'shoe-last-p1',ja:'靴のラストが決めるのは、サイズだけではありません。',answer:'A shoe last controls more than size.',source:'shoe-last-1'},
      {id:'shoe-last-p2',ja:'それは爪先、ウエスト、踵、全体のバランスを形作ります。',answer:'It shapes the toe, waist, heel, and overall balance.',source:'shoe-last-2'},
      {id:'shoe-last-p3',ja:'2足が似た材料を使っていても、印象はまったく違うことがあります。',answer:'Two shoes can use similar materials and still feel completely different.',source:'shoe-last-3'},
    ],
  },
  {
    id:'immersion-brand-archive', topicId:'brand-archive', level:'A1-A2', priority:6, modes:['commute','quick','free'],
    tags:{topics:['fashion','brand-history'],vocabulary:['archive','period','solve','create'],grammar:['more-than','before-ing'],foundation:['daily','toeic']},
    sentences:[
      {id:'brand-archive-1',en:'A fashion archive is more than old clothing.',ja:'ファッションアーカイブは、古い服だけではありません。',chunks:[{t:'A fashion archive',role:'S',ja:'ファッションアーカイブは'},{t:'is',role:'V',ja:'〜である'},{t:'more than old clothing',role:'C',ja:'古い服以上のもの'}],point:'be動詞は主語と説明をイコールで結びます。more than で価値を広げています。'},
      {id:'brand-archive-2',en:'It shows how a brand solved problems in different periods.',ja:'それは、ブランドが異なる時代にどう問題を解決したかを示します。',chunks:[{t:'It',role:'S',ja:'それは'},{t:'shows',role:'V',ja:'示す'},{t:'how a brand solved problems',role:'O',ja:'ブランドがどう問題を解決したかを'},{t:'in different periods',role:'M',ja:'異なる時代に'}],point:'how + 文で「どのように〜したか」というひとかたまりの目的語になります。'},
      {id:'brand-archive-3',en:'Young designers often study the archive before creating something new.',ja:'若いデザイナーは、新しいものを作る前によくアーカイブを研究します。',chunks:[{t:'Young designers',role:'S',ja:'若いデザイナーは'},{t:'often study',role:'V',ja:'よく研究する'},{t:'the archive',role:'O',ja:'アーカイブを'},{t:'before creating something new',role:'M',ja:'新しいものを作る前に'}],point:'before の後を動作にするときは creating のように -ing 形を使えます。'},
    ],
    production:[
      {id:'brand-archive-p1',ja:'ファッションアーカイブは、古い服だけではありません。',answer:'A fashion archive is more than old clothing.',source:'brand-archive-1'},
      {id:'brand-archive-p2',ja:'それは、ブランドが異なる時代にどう問題を解決したかを示します。',answer:'It shows how a brand solved problems in different periods.',source:'brand-archive-2'},
      {id:'brand-archive-p3',ja:'若いデザイナーは、新しいものを作る前によくアーカイブを研究します。',answer:'Young designers often study the archive before creating something new.',source:'brand-archive-3'},
    ],
  },
  {
    id:'immersion-hiphop-sampling', topicId:'hiphop-sampling', level:'A1-A2', priority:7, modes:['commute','quick','free'],
    tags:{topics:['music','hiphop'],vocabulary:['sample','producer','similar','conversation'],grammar:['can','svoc','then'],foundation:['daily','toeic']},
    sentences:[
      {id:'hiphop-sampling-1',en:'A sample can give an old sound a new meaning.',ja:'サンプルは古い音に新しい意味を与えることができます。',chunks:[{t:'A sample',role:'S',ja:'サンプルは'},{t:'can give',role:'V',ja:'与えることができる'},{t:'an old sound',role:'O',ja:'古い音に'},{t:'a new meaning',role:'O',ja:'新しい意味を'}],point:'give A B は「AにBを与える」。前置詞なしで2つの目的語を並べます。'},
      {id:'hiphop-sampling-2',en:'The producer changes its place, speed, and feeling.',ja:'プロデューサーは、その配置、速度、感触を変えます。',chunks:[{t:'The producer',role:'S',ja:'プロデューサーは'},{t:'changes',role:'V',ja:'変える'},{t:'its place, speed, and feeling',role:'O',ja:'その配置、速度、感触を'}],point:'3つ以上を並べるとき、最後の要素の前に and を置きます。'},
      {id:'hiphop-sampling-3',en:'Good conversation works in a similar way: we listen, then add something new.',ja:'良い会話も似た方法で進みます。まず聞き、それから新しいものを加えます。',chunks:[{t:'Good conversation',role:'S',ja:'良い会話は'},{t:'works',role:'V',ja:'機能する'},{t:'in a similar way',role:'M',ja:'似た方法で'},{t:'we',role:'S',ja:'私たちは'},{t:'listen',role:'V',ja:'聞く'},{t:'then add',role:'V',ja:'それから加える'},{t:'something new',role:'O',ja:'新しいものを'}],point:'コロンの後ろで「似た方法」の中身を具体的に説明しています。then は動作の順番を示します。'},
    ],
    production:[
      {id:'hiphop-sampling-p1',ja:'サンプルは古い音に新しい意味を与えることができます。',answer:'A sample can give an old sound a new meaning.',source:'hiphop-sampling-1'},
      {id:'hiphop-sampling-p2',ja:'プロデューサーは、その配置、速度、感触を変えます。',answer:'The producer changes its place, speed, and feeling.',source:'hiphop-sampling-2'},
      {id:'hiphop-sampling-p3',ja:'良い会話も似た方法で進みます。まず聞き、それから新しいものを加えます。',answer:'Good conversation works in a similar way: we listen, then add something new.',source:'hiphop-sampling-3'},
    ],
  },
];

function immersionLesson(id) {
  const lesson = IMMERSION_LESSONS.find(x => x.id === id);
  if (!lesson) return null;
  const topic = typeof TOPICS !== 'undefined' ? TOPICS.find(x => x.id === lesson.topicId) : null;
  return { ...lesson, cat: topic?.cat || '', emoji: topic?.emoji || '📘', titleJa: topic?.titleJa || lesson.id };
}
