(function(window) {
  /**
   *  Basic example setup、基本的な設定例
   *  @class ParticleExample
   *  @constructor
   *  @param {String[]} imagePaths The local path to the image source、画像ソースへのローカルパス（ノーマルの画像、アトラス等）
   *  @param {Object} config The emitter configuration、エミッターのコンフィグ設定
   *  @param {null|"path"|"anim"} [type=null] Particle type to create、作成するパーティクルタイプ（"path"と"anim"でそれぞれ専用のパーティクル）
   *  @param {boolean} [useParticleContainer=false] If a ParticleContainer should be used instead of a Container、コンテナの代わりにParticleContainer（速い）を使用する必要がある場合：true
   *  @param {boolean} [stepColors=false] If the color settings should be manually stepped、色設定を手動でステップする必要がある場合：true
   */
  var ParticleExample = function(
    imagePaths,
    config,
    type,
    useParticleContainer,
    stepColors
  ) {
    var canvas = document.getElementById("stage");

    // Basic PIXI Setup、基本的なPIXIのセットアップ
    var rendererOptions = {
      view: canvas
    };

    /*var preMultAlpha = !!options.preMultAlpha;

		if(rendererOptions.transparent && !preMultAlpha)
			rendererOptions.transparent = "notMultiplied";*/

    var stage = new PIXI.Container(),
      emitter = null,
      renderer = PIXI.autoDetectRenderer(
        canvas.width,
        canvas.height,
        rendererOptions
      ),
      bg = null;

    var framerate = document.getElementById("framerate");
    var particleCount = document.getElementById("particleCount");

    // Calculate the current time
    var elapsed = Date.now(); // 現在の時刻を計算する

    var updateId;

    // Update function every frame // 毎フレーム更新する
    var update = function() {
      // Update the next frame
      updateId = requestAnimationFrame(update);

      var now = Date.now();
      if (emitter) emitter.update((now - elapsed) * 0.001); // エミッターがあれば更新する

      framerate.innerHTML = (1000 / (now - elapsed)).toFixed(2); // fps計算

      elapsed = now; // 経過時間

      if (emitter && particleCount) // エミッターとパーティクル数があれば
        particleCount.innerHTML = emitter.particleCount;

      // render the stage
	  renderer.render(stage); // ステージにレンダリングする
    };

    // Resize the canvas to the size of the window、キャンバスのサイズをウィンドウのサイズに変更します
    window.onresize = function(event) { // ブラウザウィンドウのサイズが変更された後に resizeイベントが発生します。

      canvas.width = window.innerWidth; // ブラウザの横幅に合わせ
	  canvas.height = window.innerHeight; // ブラウザの縦幅に合わせ
	  
	  renderer.resize(canvas.width, canvas.height);// レンダラーのサイズも合わせ
	  
      if (bg) {
        //bg is a 1px by 1px image（動的にリサイズ用の1x1 px画像）
        bg.scale.x = canvas.width;
        bg.scale.y = canvas.height;
      }
    };
    window.onresize();// 一度明示的に呼び出し

	// Preload the particle images and create PIXI textures from it
	// パーティクル画像をプリロードし、そこからPIXIテクスチャを作成します
    var urls,
      makeTextures = false;
    if (imagePaths.spritesheet) urls = [imagePaths.spritesheet]; // 渡した画像パス内にspritesheetプロパティが存在すれば、urlはアトラス内のURL
    else if (imagePaths.textures) urls = imagePaths.textures.slice(); // アトラスで無いが、”textures”プロパティがある場合？シャローコピーした新しい配列を返す（endは含まれない、元の配列は変更しない）
    else {
      urls = imagePaths.slice(); // 単体画像の場合
      makeTextures = true; // texturesプロパティが無いので（後で自分で作る）
    }
	urls.push("images/bg.png"); // 背景画像を追加委する
	
    var loader = PIXI.loader;
    for (var i = 0; i < urls.length; ++i) loader.add("img" + i, urls[i]);
    loader.load(function() {
      bg = new PIXI.Sprite(PIXI.Texture.fromImage("images/bg.png"));
      //bg is a 1px by 1px image
      bg.scale.x = canvas.width;
      bg.scale.y = canvas.height;
      bg.tint = 0x000000;
	  stage.addChild(bg);
	  
      //collect the textures, now that they are all loaded、テクスチャがすべてロードされたので、テクスチャを収集します
      var art;
      if (makeTextures) {
        art = [];
        for (var i = 0; i < imagePaths.length; ++i)
          art.push(PIXI.Texture.fromImage(imagePaths[i]));
	  } else art = imagePaths.art;
	  
      // Create the new emitter and attach it to the stage、新しいエミッターを作成し、ステージにアタッチします
      var emitterContainer;
	  if (useParticleContainer) { // 通常のコンテナで無くParticleContainerを使用するオプションだった場合、
		
		emitterContainer = new PIXI.ParticleContainer(); // エミッターのコンテナは、PIXIのパーティクルコンテナ
		// PIXI.ParticleContainer
		// https://pixijs.download/dev/docs/PIXI.ParticleContainer.html
		// ・ParticleContainerクラスは、速度のみを目的として構築されたコンテナの非常に高速なバージョンであるため、多くのスプライトまたはパーティクルが必要な場合に使用します。
		// ・ParticleContainerのトレードオフは、ほとんどの高度な機能が機能しないことです。 ParticleContainerは、基本的なオブジェクト変換（位置、スケール、回転）と色合い（v4.5.6以降）などの高度な機能を実装しています。
		// ・マスキング、子、フィルターなどの他のより高度な機能は、このバッチのスプライトでは機能しません。
		// maxSize: 1500, 
		
        emitterContainer.setProperties({ // プロパティを設定する（GPUにアップロードして適用する必要がある子のプロパティ）
          scale: true, // スケール
          position: true, // 座標
          rotation: true, // 角度
          uvs: true, // uvs？
		  alpha: true // 透明度
		  // vertices ... trueの場合、頂点がアップロードされて適用されます。スプライトのscale / anchor / trim / frame / origが動的な場合は、trueに設定して下さい。
		  // tint ... ver. 4.5.6以降
		});
		
	  } else emitterContainer = new PIXI.Container(); // エミッターのコンテナは、通常のPIXIコンテナで生成
	  
	  stage.addChild(emitterContainer); // stageにエミッターのコンテナを追加する
	  
      window.emitter = emitter = new PIXI.particles.Emitter(
        emitterContainer,
        art,
        config
	  );
	  
      if (stepColors) // 手動ステップカラーがtrueなら
        emitter.startColor = PIXI.particles.ParticleUtils.createSteppedGradient( // https://github.com/pixijs/pixi-particles/blob/master/src/ParticleUtils.ts export function createSteppedGradient(list:ValueStep<string>[], numSteps:number = 10) {
          config.color.list, // コンフィグのカラーリストを使用
          stepColors // 
		);
		
      if (type == "path") // 作成するパーティクルタイプが"path"ならば
        emitter.particleConstructor = PIXI.particles.PathParticle; // PathParticleを使用 // https://github.com/pixijs/pixi-particles/blob/master/src/PathParticle.ts
      else if (type == "anim") // タイプが"anim"ならば
        emitter.particleConstructor = PIXI.particles.AnimatedParticle; // AnimatedParticleを使用 // https://github.com/pixijs/pixi-particles/blob/master/src/AnimatedParticle.ts

      // Center on the stage、ステージの中央に位置させる
	  emitter.updateOwnerPos(window.innerWidth / 2, window.innerHeight / 2); // https://github.com/pixijs/pixi-particles/blob/master/src/Emitter.ts
	  // エミッタの所有者の位置を変更します。
	  // エミッタの所有者が動き回るワールドコンテナにパーティクルを追加する場合は、これを呼び出す必要があります。

      // Click on the canvas to trigger // マウスクリックイベントを登録する
      canvas.addEventListener("mouseup", function(e) {
        if (!emitter) return;
        emitter.emit = true;
		emitter.resetPositionTracking(); // https://pixijs.io/pixi-particles/docs/classes/emitter.html
		// 次の更新でエミッタ位置の補間を防ぎます。
		// エミッターの所有者の通常の動きではない大きな位置変更を行った場合、これを使用する必要があります。
        emitter.updateOwnerPos(e.offsetX || e.layerX, e.offsetY || e.layerY);
      });

      // Start the update、更新を開始する
      update();

      // for testing and debugging、テストとデバッグ用
      window.destroyEmitter = function() {
		emitter.destroy(); // エミッターとそのすべてのパーティクルを破壊します。
        emitter = null; // 参照をnullに？
        window.destroyEmitter = null; // この命令自体をnullに？
        // cancelAnimationFrame(updateId);

        // reset SpriteRenderer's batching to fully release particles for GC
        // SpriteRendererのバッチ処理をリセットして、GCのパーティクルを完全に解放します
        if (
          renderer.plugins &&
          renderer.plugins.sprite &&
          renderer.plugins.sprite.sprites
        )
          renderer.plugins.sprite.sprites.length = 0;

        renderer.render(stage); // レンダリングする
      };
    });
  };

  // Assign to global space（グローバル空間に割り当てる）
  window.ParticleExample = ParticleExample;

})(window);
