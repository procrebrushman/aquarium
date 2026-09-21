# Third-party assets

## Guppie Animated

- 生体: グッピー
- 作者: Comitre
- 元URL: https://sketchfab.com/3d-models/guppie-animated-53abad43280a4b7ab26bd0e6b8dea62f
- ライセンス: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: 必須。作者名と元URLをこのファイルに記載。
- 使用ファイル: `scenes/riverscape/assets/fish/user/guppie_animated.glb`
- 元animation: あり。GLBの `Take 001` を確認。
- 変更内容: 表示中心と長さをRiverscapeの水槽スケールへ正規化し、複製して配置。追加の魚モデルは使わず、同じ低ポリゴンGLBを個体ごとに色替えして、red tail、aqua white、leopard gold、ice blue、white、rose lavenderの色展開を実装。胴体、尾びれ、各ヒレ、体のラインをスキン後のローカル位置マスクで別々に着色し、境界を滑らかにして元テクスチャの細部を残した。leopard goldのみ手続き的な斑点を加えた。元のRiverscape魚に合わせて物理マテリアル、クリアコート、弱いイリデッセンス、ニュートラルなアンビエント補光を適用し、胴体の暗部を持ち上げ、尾とヒレには薄い透過感を加えた。
- 泳ぎ: Riverscape既存の魚状態を使い、移動、群泳、回避、カーソル反応、餌への反応を共有。GLBの `Take 001` は `AnimationMixer` でループ再生。

## Neon Tetra / Paracheirodon innesi

- 生体: ネオンテトラ
- 作者: BlueMesh
- 元URL: https://sketchfab.com/3d-models/paracheirodon-innesi---tetra-neon-2fabf5db754746b7b81ebfa0bbe99161
- ライセンス: Creative Commons Attribution (CC BY、モデルページ表示)
- Attribution: 必須。作者名と元URLをこのファイルに記載。提供されたGLB自体にはライセンスメタデータが埋め込まれていないため、出典ページの表示に従ってクレジットを保持。
- 使用ファイル: `scenes/riverscape/assets/fish/user/neon_tetra_aquarium_fish.glb`
- 元animation: なし。GLBのanimation数0を確認。
- 変更内容: 表示中心と長さを小型群泳魚用の水槽スケールへ正規化し、10匹を配置。
- 泳ぎ: Riverscape既存の魚状態を使い、移動、群泳、回避、カーソル反応、餌への反応を共有。元animationがないため、既存の魚状態の方向・速度・曲がりに追従し、微小な揺れを追加。

## Runtime dependency

Three.jsの公式GLTF/Skeletonユーティリティを `vendor/` に配置して使用しています。Three.js本体と同じく、同梱の `vendor/THREE-LICENSE.txt` に記載されたライセンスを適用します。
