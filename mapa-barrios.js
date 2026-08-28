/* ═══════════════════════════════════════════════════════════════════
   BAIREN · Mapa interactivo de barrios (CABA)
   ───────────────────────────────────────────────────────────────────
   Dos cosas viven acá:

   1. window.BairenZonas — la lógica de ZONAS (compartida con el catálogo):
        zonaDe('Palermo Soho')  → 'Palermo'
        contar(props)           → { Palermo: 12, Recoleta: 9, … }
        lista()                 → nombres canónicos para filtros/pills
      Una zona agrupa barrios "comerciales" (Palermo Soho, Hollywood,
      Las Cañitas → Palermo). La tarjeta y la ficha siguen mostrando el
      barrio específico; solo el filtro y el mapa agrupan.

   2. window.BairenMapa.mount(el, opts) — el mapa SVG con un isotipo por
      zona con inventario. Los polígonos son los 48 barrios oficiales
      (Buenos Aires Data, simplificados a ~14 KB). Los pins son HTML
      posicionados en %, así mantienen tamaño fijo en px en cualquier
      pantalla. El encuadre se recorta al área con inventario y los
      bordes cortados se desvanecen. Los rótulos se colocan solos:
      prueban derecha / izquierda / abajo / arriba y toman el primer
      lado sin colisión; si no entra ninguno, el rótulo se oculta
      (queda el badge con el número; el nombre vive en aria-label).

      opts: { counts, lang, active, onSelect(zona), onHover(zona|null) }
      devuelve: { setCounts, setLang, setActive, refresh }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const VB = [0, 0, 1000, 1106.4];
  const PATHS = {"Agronomia":"M283.3 403.7 268.3 452.8 244.8 441.0 174.9 435.2 142.5 420.5 144.8 420.1 142.8 417.5 217.6 360.9 238.4 387.5Z","Almagro":"M588.3 441.6 609.1 442.5 598.9 499.7 598.0 503.8 595.1 505.6 596.1 521.3 604.2 542.2 605.9 582.6 528.2 591.5 520.8 548.3 516.8 550.5 513.6 491.6 500.0 471.4 505.6 468.1 519.9 449.5 533.4 442.2 553.4 440.7Z","Balvanera":"M705.8 452.6 711.5 524.7 712.0 567.2 651.9 571.5 605.9 582.6 604.2 542.2 596.1 521.3 595.1 505.6 598.0 503.8 598.9 499.7 609.1 442.5 646.8 442.7 659.5 451.0 676.3 453.4Z","Barracas":"M819.2 637.4 834.5 765.1 824.3 772.5 822.5 777.3 823.6 786.4 809.6 795.1 801.6 806.1 745.3 812.8 738.8 818.1 732.3 827.1 716.8 832.5 712.6 837.9 708.1 839.7 698.8 839.8 692.3 837.6 684.4 838.5 680.3 833.7 666.1 829.2 644.1 763.0 655.8 746.1 666.7 742.9 667.2 739.0 713.6 715.3 713.2 707.5 721.3 703.7 718.9 666.0 754.3 654.3 764.8 645.7 765.2 659.5 770.9 659.3 778.6 643.6 776.5 636.4 799.3 620.7 817.6 619.8Z","Belgrano":"M412.2 56.4 400.2 57.2 394.4 62.1 390.5 67.8 394.3 76.1 404.1 80.9 409.1 72.1 415.8 67.2 415.0 59.6 419.9 56.1 421.3 57.7 418.2 60.8 422.4 67.5 427.2 61.9 433.6 58.9 446.4 59.7 454.4 66.9 454.4 65.2 457.1 70.6 458.0 68.9 459.3 74.8 460.6 73.3 462.1 85.4 464.4 84.9 464.8 78.7 465.0 82.6 470.0 84.4 479.3 83.6 478.5 82.3 487.0 87.3 491.8 95.4 495.6 95.1 491.9 95.9 492.9 98.7 510.2 113.2 513.0 120.3 513.3 128.9 516.4 126.4 517.7 128.9 515.8 133.0 514.0 130.1 513.1 131.5 519.7 138.5 523.4 140.1 529.6 134.5 532.0 136.3 533.4 134.1 541.8 139.1 533.9 157.9 520.0 151.4 512.0 152.4 494.5 164.4 493.3 167.7 496.0 170.0 477.8 183.5 465.2 189.4 460.7 194.3 459.0 200.0 464.4 210.8 476.3 218.2 491.7 218.4 492.2 220.3 489.5 223.1 460.1 220.6 453.1 230.2 426.1 248.9 420.0 256.0 403.5 245.2 376.3 263.0 375.9 266.3 347.1 300.2 326.7 284.7 323.1 287.2 296.1 248.6 331.2 220.9 325.1 217.8 328.4 215.5 317.4 200.7 399.8 148.6 394.0 141.8 394.1 139.2 418.8 100.0 406.4 91.8 391.0 85.6 367.0 70.0 370.7 66.3 395.5 52.9 406.3 32.2 409.9 36.1 414.5 49.2 415.1 53.6Z","La Boca":"M918.0 574.4 920.5 576.6 926.6 577.3 935.3 572.2 951.9 572.4 951.5 576.3 948.9 577.6 943.1 573.7 938.9 578.6 945.1 596.9 944.3 591.1 945.7 590.2 946.0 591.7 947.4 588.1 951.4 586.9 954.6 589.5 953.4 579.7 958.0 570.7 967.4 569.2 982.5 570.2 988.0 578.7 991.0 589.9 989.5 594.3 985.7 596.0 977.8 594.6 965.6 596.1 964.5 592.5 959.9 595.4 963.2 599.5 965.7 597.4 975.1 598.7 984.3 607.7 990.5 608.9 999.9 618.4 1000.0 622.5 994.7 629.2 979.0 633.7 976.6 627.1 971.9 627.1 962.9 616.8 953.6 618.1 968.2 633.7 962.5 637.1 958.4 635.7 952.0 628.1 947.9 632.3 939.4 623.7 930.7 632.4 932.3 634.0 930.6 634.8 932.3 639.6 934.8 640.1 933.0 642.2 934.9 647.6 936.2 646.2 936.8 649.1 944.3 650.8 929.2 656.3 923.6 654.9 918.6 648.9 912.3 634.4 909.2 635.3 904.2 628.7 872.0 603.0 869.1 604.9 864.5 601.1 868.3 605.8 867.0 607.6 899.5 634.3 905.1 644.7 910.3 662.6 906.5 675.9 903.3 680.8 893.6 687.2 883.5 697.4 871.7 697.4 867.7 698.6 866.1 701.6 868.9 706.9 883.0 714.0 887.1 727.4 885.7 733.2 874.4 739.3 861.3 752.8 851.4 753.3 834.5 765.1 819.2 637.4 833.0 622.8 832.9 610.8 857.2 610.4 893.8 563.8 898.2 575.8 902.7 575.3 903.6 576.8 906.5 574.9 910.7 577.2 911.3 575.8 914.6 576.3 916.6 573.5Z","Boedo":"M609.8 642.7 611.1 658.2 616.3 672.9 612.4 690.6 550.1 703.6 528.2 591.5 605.9 582.6 608.4 597.0 606.9 597.4Z","Caballito":"M528.2 591.5 533.5 621.9 407.1 644.5 350.4 500.5 372.0 482.7 434.2 502.0 470.1 489.4 500.0 471.4 513.6 491.6 516.8 550.5 520.8 548.3Z","Chacarita":"M363.1 320.6 375.7 321.5 387.6 325.4 409.9 334.1 443.6 350.9 441.7 359.0 473.5 384.8 412.1 420.2 387.2 441.5 367.9 434.3 345.0 432.8 335.6 434.5 341.9 408.8 329.4 396.7 354.7 368.5 362.3 365.3 361.5 320.6Z","Coghlan":"M317.4 200.7 328.4 215.5 325.1 217.8 331.2 220.9 298.1 247.2 289.9 249.5 287.2 245.8 281.8 249.7 265.9 232.5 267.2 231.7 260.4 227.9 256.5 222.8 244.2 201.8 295.0 167.3Z","Colegiales":"M420.0 256.0 462.3 282.3 445.8 302.4 466.4 322.1 448.6 342.2 443.4 350.7 409.9 334.1 387.6 325.4 375.7 321.5 363.1 320.6 347.1 300.2 375.9 266.3 376.3 263.0 403.5 245.2Z","Constitucion":"M794.1 623.8 776.5 636.4 778.6 643.6 770.9 659.3 765.2 659.5 764.8 645.7 754.3 654.3 718.9 666.0 714.7 623.5 712.0 567.2 785.1 562.9 786.5 600.9 788.2 610.3Z","Flores":"M407.1 644.5 392.8 649.8 407.8 686.7 444.4 719.8 450.4 713.4 479.2 747.9 491.9 741.0 514.8 763.5 476.2 800.2 451.0 776.0 449.1 771.6 442.5 770.1 421.1 771.5 391.5 769.4 389.4 778.5 362.2 806.4 328.4 773.4 348.9 740.6 317.1 711.0 273.5 593.4 320.2 563.5 367.0 540.8Z","Floresta":"M273.5 593.4 306.6 681.7 295.5 685.7 282.4 695.8 169.7 587.1 198.0 558.4 248.4 607.3Z","Liniers":"M106.2 670.3 121.5 677.0 125.8 676.5 131.6 682.1 107.0 686.1 110.5 702.4 148.8 738.4 29.3 806.9 11.8 790.9 5.9 670.2 36.8 668.2 55.2 664.2 54.9 660.4 57.4 657.8 84.8 660.3Z","Mataderos":"M184.4 732.4 268.4 812.8 232.1 841.3 216.8 846.9 175.6 895.3 147.6 915.9 29.3 806.9 175.1 723.5Z","Monserrat":"M834.1 497.6 839.2 551.6 784.7 555.7 785.1 562.9 712.0 567.2 710.7 512.4 814.6 503.7 821.0 499.4 821.6 495.6Z","Monte Castro":"M187.1 547.8 198.0 558.4 169.7 587.1 142.7 603.6 123.4 625.6 101.2 605.1 77.1 630.9 50.3 605.9 94.1 558.4 159.5 511.3Z","Nueva Pompeya":"M655.8 746.1 644.1 763.0 664.4 826.1 654.1 822.1 632.9 826.2 627.2 825.1 612.8 817.3 602.3 816.3 567.8 827.2 547.3 838.8 533.6 817.9 494.4 783.5 514.8 763.5 491.9 741.0 506.2 734.3 505.0 713.2 512.3 711.3 612.4 690.6 601.3 723.8 608.1 755.5Z","Nuñez":"M370.7 66.3 367.0 70.0 372.9 74.9 391.0 85.6 406.4 91.8 418.8 100.0 394.1 139.2 394.0 141.8 399.8 148.6 317.4 200.7 290.7 160.5 322.5 138.9 283.0 75.1 344.9 41.9 358.8 22.5 368.0 4.1 375.4 0.0 386.7 5.8 393.7 15.6 402.1 19.4 407.3 24.3 389.8 54.3Z","Palermo":"M541.4 152.9 538.9 158.8 589.9 175.8 613.0 191.0 618.4 186.6 621.3 186.5 621.7 189.6 617.8 195.4 649.9 228.9 675.9 212.0 649.7 229.4 656.5 231.8 664.1 228.0 665.3 229.3 664.1 232.3 666.1 234.0 673.8 230.0 684.9 238.3 685.7 243.4 668.8 263.1 670.2 264.2 682.5 248.8 685.1 248.6 691.2 255.2 694.2 262.8 697.4 264.5 706.2 283.1 694.2 282.8 669.1 265.2 671.2 274.2 656.3 294.9 663.9 304.7 687.3 321.9 667.0 358.8 659.9 352.3 638.3 352.5 618.4 387.2 596.5 418.1 588.3 441.6 550.8 440.9 532.5 431.4 441.7 359.0 443.4 350.7 448.6 342.2 466.4 322.1 445.8 302.4 462.3 282.3 420.0 256.0 426.1 248.9 453.1 230.2 460.1 220.6 484.2 223.3 489.5 223.1 492.2 220.3 491.7 218.4 479.9 219.0 469.9 215.3 461.7 207.7 459.0 200.0 460.7 194.3 465.2 189.4 477.8 183.5 496.0 170.0 493.3 167.7 494.5 164.4 508.4 154.2 518.2 151.3 538.7 158.7 546.3 140.8Z","Parque Avellaneda":"M362.2 806.4 341.6 826.5 325.2 810.8 315.5 820.6 310.4 816.4 300.5 843.3 184.4 732.4 269.8 683.8 282.4 695.8 295.5 685.7 306.6 681.7 317.1 711.0 348.9 740.6 328.4 773.4Z","Parque Chacabuco":"M550.1 703.6 505.0 713.2 506.2 734.3 479.2 747.9 450.4 713.4 444.4 719.8 407.8 686.7 392.8 649.8 407.1 644.5 533.5 621.9Z","Parque Chas":"M309.1 377.2 283.3 403.7 238.4 387.5 217.6 360.9 267.5 325.7 285.7 330.9 295.1 342.0Z","Parque Patricios":"M718.9 666.0 721.3 703.7 713.2 707.5 713.6 715.3 667.2 739.0 668.1 741.7 664.2 744.0 608.1 755.5 601.3 723.8 616.2 675.8 611.1 658.2 609.8 642.7 627.2 637.5 714.7 623.5Z","Paternal":"M329.4 396.7 341.9 408.8 335.6 434.5 345.0 432.8 367.9 434.3 383.4 440.0 373.6 478.6 369.6 481.9 318.8 466.4 292.8 487.7 275.1 460.0 280.7 456.1 268.3 452.8 284.1 401.1 309.1 377.2Z","Puerto Madero":"M918.0 574.4 916.6 573.5 914.6 576.3 911.3 575.8 910.7 577.2 906.5 574.9 903.6 576.8 902.7 575.3 898.2 575.8 893.8 563.8 857.2 610.4 844.0 603.3 830.7 461.2 825.0 444.5 857.0 442.9 855.9 437.1 877.3 425.4 894.2 424.7 906.9 434.4 912.2 442.1 940.6 469.3 945.4 496.4 967.8 515.9 970.9 520.9 975.4 540.7 976.0 554.5 971.7 559.4 949.7 563.4 929.1 559.0 923.0 561.5 920.3 567.3 925.4 567.6 924.5 570.7 920.7 569.7 922.5 572.0ZM850.7 531.6 849.3 529.8 849.3 531.7 845.6 532.4 848.5 563.6 852.3 563.5 852.6 565.4 853.7 563.3 857.4 562.8 854.4 531.5ZM846.8 488.8 845.2 487.0 845.2 489.0 841.6 489.5 845.1 527.5 848.9 527.4 849.2 529.2 850.3 527.2 854.0 526.6 850.4 488.7ZM843.3 449.7 841.4 447.0 841.5 449.8 837.9 450.6 841.2 485.1 844.8 484.9 845.2 486.5 850.0 484.1 846.7 449.7ZM854.2 567.7 852.7 566.0 852.6 567.9 849.0 568.4 851.8 599.7 859.9 599.1 863.0 601.6 860.6 598.2 857.8 567.6Z","Recoleta":"M791.8 315.5 788.4 315.9 802.3 325.6 796.4 334.3 791.2 330.8 772.4 332.1 755.2 320.7 738.1 319.4 721.4 320.0 712.3 336.3 736.1 353.1 744.5 364.4 748.7 374.2 752.8 377.5 731.1 403.2 734.6 422.4 736.7 450.5 676.3 453.4 659.5 451.0 646.8 442.7 588.3 441.6 596.5 418.1 618.4 387.2 638.3 352.5 659.9 352.3 667.0 358.8 687.3 321.9 663.9 304.7 656.3 294.9 671.2 274.2 669.1 265.2 694.2 282.8 706.2 283.1 705.5 281.5 744.6 308.2 754.3 307.4 757.1 302.4 714.3 273.0 715.4 269.7 719.1 265.1 749.8 262.4 755.7 259.2 766.3 260.1 768.0 269.9 769.8 269.8 769.6 260.6 771.2 258.5 771.5 271.5 778.7 271.8 816.9 299.2 778.3 272.2 769.8 272.2 769.0 275.7 780.2 283.5 780.4 286.2 753.5 288.9 753.5 290.4 762.4 296.5 794.4 293.4 818.7 310.1 818.8 312.9Z","Retiro":"M891.4 424.1 877.3 425.4 855.9 437.1 857.0 442.9 736.7 450.5 734.6 422.4 731.1 403.2 752.8 377.5 748.7 374.2 744.5 364.4 736.1 353.1 712.3 336.3 721.4 320.0 753.4 320.2 772.4 332.1 791.2 330.8 796.4 334.3 802.3 325.6 788.4 315.9 791.8 315.5 800.7 323.1 833.1 320.0 846.4 329.3 846.7 332.1 819.6 334.7 819.5 336.0 827.8 341.8 865.2 338.2 866.3 349.5 842.4 351.8 842.2 353.1 848.3 359.0 873.9 356.6 874.9 367.7 854.9 369.7 855.5 377.3 875.5 375.6 876.2 381.1 869.2 384.1 869.7 386.4 868.9 384.1 832.8 393.0 833.2 395.7 840.3 399.0 851.2 419.4 848.9 420.6 837.4 401.6 836.4 402.6 840.9 411.5 838.2 412.8 833.4 405.1 837.1 413.4 827.2 418.7 833.2 439.2 840.4 438.9 841.0 443.9 842.4 443.8 842.1 438.7 853.9 437.5 851.0 427.1 852.6 425.9 856.1 434.2 871.5 427.1 873.2 423.9 903.3 421.9 919.6 425.2 903.4 422.1 890.3 423.1Z","Saavedra":"M295.0 167.3 245.0 201.4 206.4 223.8 201.6 215.4 116.7 265.5 114.5 269.2 110.2 264.7 157.7 142.3 283.0 75.1 322.5 138.9 290.7 160.5Z","San Cristobal":"M714.7 623.5 627.2 637.5 609.8 642.7 606.9 597.4 608.4 597.0 605.9 582.6 651.9 571.5 712.0 567.2Z","San Nicolas":"M834.1 497.6 821.6 495.6 821.0 499.4 814.6 503.7 710.7 512.4 705.8 452.6 825.0 444.5 830.7 461.2Z","San Telmo":"M855.9 610.3 832.9 610.8 833.0 622.8 819.2 637.4 817.6 619.8 799.3 620.7 794.1 623.8 788.2 610.3 786.5 600.9 784.7 555.7 839.2 551.6 844.0 603.3Z","Velez Sarsfield":"M269.8 683.8 222.6 710.4 194.5 683.6 195.6 680.8 192.1 681.6 160.6 651.5 155.2 654.2 123.4 625.6 142.7 603.6 169.7 587.1Z","Versalles":"M50.3 605.9 117.8 669.0 106.2 670.3 84.8 660.3 57.4 657.8 54.9 660.4 55.2 664.2 36.8 668.2 5.9 670.2 3.6 625.2 44.2 600.2Z","Villa Crespo":"M550.8 440.9 533.4 442.2 528.3 444.5 519.9 449.5 505.6 468.1 470.1 489.4 434.2 502.0 369.6 481.9 373.6 478.6 383.4 440.0 387.2 441.5 412.1 420.2 473.5 384.8 532.5 431.4Z","Villa Del Parque":"M268.3 452.8 280.7 456.1 275.1 460.0 292.8 487.7 274.5 500.4 218.3 517.6 187.1 547.8 129.1 469.6 175.1 435.0 244.8 441.0Z","Villa Devoto":"M142.8 417.5 144.8 420.1 142.5 420.5 174.9 435.2 129.1 469.6 159.5 511.3 94.1 558.4 74.2 580.0 10.4 522.3 81.4 339.0 86.6 341.9Z","Villa Gral. Mitre":"M369.6 481.9 372.0 482.7 350.4 500.5 367.0 540.8 341.1 552.6 305.0 573.4 260.3 505.2 280.9 496.6 318.8 466.4Z","Villa Lugano":"M341.6 826.5 321.2 848.8 317.2 850.1 312.3 848.5 311.4 853.6 339.9 881.1 347.8 884.2 364.6 904.5 366.5 909.9 375.8 915.1 411.9 950.1 346.9 1022.9 283.8 963.1 245.3 1005.3 147.6 915.9 175.6 895.3 216.8 846.9 232.1 841.3 268.4 812.8 300.5 843.3 310.4 816.4 315.5 820.6 325.2 810.8Z","Villa Luro":"M123.4 625.6 155.2 654.2 160.6 651.5 192.1 681.6 195.6 680.8 194.5 683.6 222.6 710.4 184.4 732.4 175.1 723.5 148.8 738.4 110.5 702.4 107.0 686.1 131.6 682.1 125.8 676.5 121.5 677.0 106.2 670.3 117.8 669.0 77.1 630.9 101.2 605.1Z","Villa Ortuzar":"M347.1 300.2 363.1 320.6 361.5 320.6 362.3 365.3 354.7 368.5 329.4 396.7 309.2 377.3 295.1 342.0 285.7 330.9 267.5 325.7 326.7 284.7Z","Villa Pueyrredon":"M114.5 269.2 145.5 291.2 217.6 360.9 142.8 417.5 86.6 341.9 81.4 339.0 110.2 264.7Z","Villa Real":"M74.2 580.0 50.3 605.9 44.2 600.2 3.6 625.2 0.0 550.8 10.4 522.3Z","Villa Riachuelo":"M444.2 980.4 355.5 1106.4 245.3 1005.3 283.8 963.1 346.9 1022.9 409.3 953.2 410.2 955.3 415.5 953.0Z","Villa Santa Rita":"M305.0 573.4 248.4 607.3 187.1 547.8 218.3 517.6 260.3 505.2Z","Villa Soldati":"M494.4 783.5 533.6 817.9 547.3 838.8 530.2 856.3 444.2 980.4 415.5 953.0 409.5 955.0 411.2 948.9 375.8 915.1 367.2 910.6 364.6 904.5 347.8 884.2 339.9 881.1 312.5 855.0 311.3 849.5 321.2 848.8 389.4 778.5 391.5 769.4 421.1 771.5 442.5 770.1 449.1 771.6 451.0 776.0 476.2 800.2Z","Villa Urquiza":"M298.1 247.2 296.1 248.6 323.1 287.2 217.6 360.9 145.5 291.2 114.5 269.2 116.7 265.5 201.6 215.4 206.4 223.8 244.2 201.8 256.5 222.8 260.4 227.9 267.2 231.7 265.9 232.5 281.8 249.7 287.2 245.8 289.9 249.5Z"};
  const CENT = {"Agronomia":[218.2,411.2],"Almagro":[559.0,512.0],"Balvanera":[654.2,511.2],"Barracas":[749.9,742.0],"Belgrano":[414.2,174.8],"La Boca":[889.7,647.1],"Boedo":[573.8,640.3],"Caballito":[447.7,559.0],"Chacarita":[393.8,382.9],"Coghlan":[288.1,211.2],"Colegiales":[410.2,298.0],"Constitucion":[749.3,609.8],"Flores":[373.0,682.6],"Floresta":[244.1,626.2],"Liniers":[63.1,725.9],"Mataderos":[151.7,816.1],"Monserrat":[773.4,533.4],"Monte Castro":[127.0,574.3],"Nueva Pompeya":[573.6,767.5],"Nuñez":[351.0,103.9],"Palermo":[556.0,293.1],"Parque Avellaneda":[280.4,755.9],"Parque Chacabuco":[477.8,677.3],"Parque Chas":[266.8,365.3],"Parque Patricios":[661.2,687.2],"Paternal":[320.1,438.9],"Puerto Madero":[891.9,511.8],"Recoleta":[695.6,366.9],"Retiro":[792.0,383.1],"Saavedra":[217.8,164.5],"San Cristobal":[660.2,602.5],"San Nicolas":[769.0,477.6],"San Telmo":[814.7,588.0],"Velez Sarsfield":[194.7,648.9],"Versalles":[46.3,641.3],"Villa Crespo":[452.2,447.6],"Villa Del Parque":[208.0,481.2],"Villa Devoto":[87.8,469.4],"Villa Gral. Mitre":[318.7,516.9],"Villa Lugano":[281.9,918.9],"Villa Luro":[146.6,680.2],"Villa Ortuzar":[325.2,337.1],"Villa Pueyrredon":[142.7,344.1],"Villa Real":[27.9,575.5],"Villa Riachuelo":[347.1,1023.3],"Villa Santa Rita":[247.3,555.1],"Villa Soldati":[432.5,859.7],"Villa Urquiza":[222.4,278.8]};
  const RIO  = {"x": 686, "y": 146, "rot": 33.6};
  const OUTLINE = "M0.0 550.8 157.7 142.3 344.8 42.0 358.8 22.5 366.7 8.4 368.0 4.0 371.7 1.1 376.4 0.0 380.9 1.6 386.7 5.8 393.6 15.4 402.1 19.4 406.4 22.3 407.3 24.3 390.3 53.5 390.4 55.3 391.5 55.6 395.9 52.3 406.4 32.2 409.9 36.2 414.5 49.3 415.1 53.6 413.1 56.0 410.3 57.0 399.9 57.3 393.4 63.5 390.5 68.0 391.6 72.0 394.3 76.1 404.0 80.8 409.1 72.1 415.5 67.5 415.0 59.6 419.9 56.1 421.3 57.7 418.3 61.0 422.7 67.4 427.2 61.9 433.5 58.9 445.3 60.6 446.4 59.7 453.2 65.4 454.4 65.2 456.5 69.1 458.0 68.9 459.0 73.0 460.6 73.3 462.1 84.9 464.3 84.5 464.7 78.7 465.3 82.5 469.9 84.4 478.5 82.3 486.3 86.7 489.8 90.7 492.1 95.2 495.6 95.1 495.6 96.1 492.6 96.3 492.8 98.6 495.7 101.6 506.1 108.3 510.2 113.2 513.0 120.3 513.5 127.6 514.8 128.3 516.4 126.4 517.2 127.5 517.7 130.1 516.3 133.6 519.7 138.5 523.4 140.1 529.6 134.5 531.8 135.8 533.4 134.1 541.8 138.8 534.9 155.6 535.4 157.2 539.0 158.0 546.4 140.8 539.4 157.6 539.8 159.2 589.9 175.8 597.2 179.4 612.6 190.6 615.0 190.4 618.4 186.6 621.1 186.3 621.7 189.6 618.3 193.3 618.6 196.1 649.5 228.1 653.5 226.5 675.9 212.0 676.4 213.0 653.8 226.7 651.4 229.2 651.4 230.7 657.4 231.7 664.1 228.0 665.3 229.0 664.7 232.6 666.1 233.7 671.8 229.8 673.8 230.0 684.9 238.3 686.2 242.3 682.4 246.1 682.4 247.8 687.4 249.9 689.0 252.0 693.9 260.6 694.4 263.0 697.4 264.5 705.5 281.5 723.2 294.2 744.5 308.2 754.4 307.2 757.1 303.9 756.8 302.3 714.3 273.0 714.3 271.7 719.1 265.1 749.7 262.4 755.7 259.2 766.0 259.9 767.8 265.3 768.9 265.8 769.7 264.8 769.7 260.0 771.2 258.5 770.4 267.5 772.0 271.2 776.5 271.1 778.8 271.8 816.9 299.2 776.7 271.6 770.4 272.2 769.6 275.6 780.2 283.5 780.3 286.2 754.8 288.8 754.0 289.8 754.4 291.1 762.4 296.5 794.8 293.5 818.7 310.1 819.0 312.7 793.1 315.4 792.3 316.4 792.8 317.7 800.9 323.1 833.0 320.0 846.5 329.4 846.6 332.1 820.3 335.1 820.5 336.8 827.6 341.7 865.2 338.2 866.3 349.5 843.3 351.7 842.5 353.3 848.4 358.9 873.9 356.6 874.9 367.7 855.6 369.7 854.9 370.9 855.4 376.3 856.4 377.4 875.5 375.6 876.2 381.1 874.5 382.7 869.9 384.0 869.7 386.4 868.2 384.3 833.2 393.2 833.4 395.7 840.3 399.1 851.2 419.4 848.9 420.6 842.9 410.6 827.8 418.3 827.5 419.7 833.1 438.8 841.2 439.3 853.1 437.5 853.7 436.1 851.0 427.0 852.6 425.9 853.7 426.5 856.7 434.1 860.8 433.2 871.2 427.3 871.9 424.4 873.2 423.9 903.3 421.9 919.5 424.8 903.4 422.1 895.4 422.7 894.5 423.9 906.9 434.4 912.1 442.0 940.6 469.3 942.4 481.5 944.4 485.8 944.0 489.8 945.4 496.4 967.8 515.9 970.2 519.6 973.6 532.0 976.1 548.0 975.4 555.6 971.7 559.4 969.8 559.9 961.2 560.2 949.7 563.4 938.1 561.9 935.1 560.2 929.4 559.1 923.6 561.5 921.6 564.0 921.5 566.3 925.4 567.6 924.5 570.7 921.3 572.8 920.3 575.3 926.6 577.3 935.3 572.2 941.9 573.0 948.8 571.3 951.9 572.4 951.5 576.3 948.9 577.6 947.6 577.8 942.5 573.9 939.0 578.3 939.8 584.6 943.4 592.1 948.4 587.4 953.3 586.9 953.4 579.7 954.7 575.4 958.0 570.6 967.3 569.2 973.2 570.4 976.6 569.2 982.5 570.2 985.2 572.2 987.9 578.5 988.5 584.4 990.9 589.5 990.4 593.1 986.2 596.0 970.2 594.8 968.9 595.3 968.7 596.6 975.1 598.7 985.0 607.9 990.5 608.9 999.9 618.4 1000.0 622.5 994.9 627.8 994.7 629.2 992.6 628.8 991.0 630.5 979.0 633.7 976.6 627.6 971.9 627.1 971.0 625.0 969.3 624.4 968.4 622.3 966.3 621.4 962.8 617.2 954.7 618.0 954.5 620.0 959.6 623.9 959.8 625.3 964.1 628.4 968.2 633.7 962.5 637.1 958.4 635.7 957.7 633.9 952.1 628.8 947.9 632.2 939.0 624.1 932.0 631.1 932.3 634.0 930.7 635.4 932.1 636.7 932.5 639.5 934.8 640.1 935.1 641.2 933.8 642.4 934.2 645.3 936.2 646.2 936.2 648.8 944.3 650.8 929.2 656.3 923.7 654.9 918.6 648.9 914.0 636.2 912.6 634.8 909.2 635.3 904.1 628.6 872.6 603.5 870.4 603.3 867.8 606.7 867.9 608.3 896.5 631.1 903.7 641.2 910.3 662.6 907.8 672.2 903.3 680.8 893.7 687.1 888.9 693.5 883.5 697.4 871.6 697.4 867.8 698.7 866.4 701.1 869.0 706.9 881.2 712.0 883.0 714.0 887.1 727.4 885.7 733.2 874.4 739.3 864.2 750.9 861.3 752.8 851.5 753.2 848.1 756.8 824.5 772.3 822.5 777.2 824.2 784.3 823.6 786.4 809.6 795.1 804.1 803.8 801.6 806.1 796.5 807.2 790.4 806.5 785.0 807.3 775.4 810.4 754.3 810.8 745.3 812.8 738.8 818.4 734.5 824.8 730.8 828.2 719.6 831.4 716.8 833.0 712.6 837.9 704.5 840.3 692.4 837.8 683.6 838.3 680.4 833.8 670.7 831.7 666.0 829.2 664.2 825.9 657.0 822.6 649.4 822.6 637.2 826.2 632.9 826.2 627.2 825.1 613.3 817.4 606.6 816.1 595.7 817.5 567.8 827.2 558.5 831.5 546.8 839.2 538.6 846.3 530.2 856.4 408.8 1031.5 355.5 1106.4 11.8 790.9Z";   // silueta exacta de CABA (unión de los 48 barrios)
  const LABELS = {"Agronomia": [211.8, 405.8, 32.1], "Almagro": [556.6, 484.6, 43.6], "Balvanera": [654.2, 513.1, 56.4], "Barracas": [767.5, 746.6, 62.4], "Belgrano": [455.4, 134.5, 49.2], "La Boca": [862.6, 656.8, 41.4], "Boedo": [571.6, 623.5, 37.1], "Caballito": [450.7, 567.8, 67.7], "Chacarita": [403.2, 377.1, 41.8], "Coghlan": [286.7, 208.9, 29.6], "Colegiales": [404.6, 291.2, 38.0], "Constitucion": [750.7, 608.8, 36.7], "Flores": [342.0, 624.6, 53.0], "Floresta": [258.8, 633.8, 28.1], "Liniers": [61.9, 724.5, 53.3], "Mataderos": [147.2, 819.9, 70.0], "Monserrat": [763.4, 535.7, 28.5], "Monte Castro": [148.4, 560.8, 33.6], "Nueva Pompeya": [562.7, 776.2, 49.5], "Nu\u00f1ez": [358.1, 115.9, 42.5], "Palermo": [559.0, 291.8, 97.2], "Parque Avellaneda": [279.5, 749.3, 53.5], "Parque Chacabuco": [477.9, 677.2, 44.8], "Parque Chas": [268.5, 364.9, 32.3], "Parque Patricios": [666.2, 683.1, 50.4], "Paternal": [305.2, 437.0, 30.5], "Puerto Madero": [901.5, 516.0, 48.1], "Recoleta": [682.2, 404.8, 48.4], "Retiro": [786.6, 404.3, 43.1], "Saavedra": [208.7, 168.2, 46.9], "San Cristobal": [658.2, 602.0, 31.0], "San Nicolas": [740.6, 479.7, 29.4], "San Telmo": [814.3, 588.4, 28.2], "Velez Sarsfield": [166.0, 623.3, 28.6], "Versalles": [36.0, 638.7, 28.5], "Villa Crespo": [452.8, 448.0, 44.4], "Villa Del Parque": [192.7, 480.8, 44.3], "Villa Devoto": [80.2, 498.8, 56.4], "Villa Gral. Mitre": [316.8, 520.6, 38.7], "Villa Lugano": [263.0, 900.1, 66.4], "Villa Luro": [160.4, 695.3, 31.7], "Villa Ortuzar": [327.3, 330.4, 34.2], "Villa Pueyrredon": [151.6, 356.9, 43.2], "Villa Real": [29.3, 576.4, 27.9], "Villa Riachuelo": [350.6, 1056.3, 33.5], "Villa Santa Rita": [244.0, 550.0, 38.0], "Villa Soldati": [431.0, 862.0, 76.6], "Villa Urquiza": [224.3, 282.0, 60.7], "San Nicolas+Monserrat": [765.4, 504.0, 55.0], "Puerto Madero:diques": [876.5, 463.6, 28.4]};     // punto de rótulo por barrio: polylabel (pole of inaccessibility) + radio libre
  const AVENIDAS = "M356 1100 323 1074 299 1049 30 804 19 792 15 780 4 550 160 149M160 149 171 138 284 77 328 54 343 50 304 68 241 103 200 128M227 105 270 82M296 68 325 53M327 51 346 48 354 51 340 49 323 56 170 138 158 149 4 547 3 556 14 778 18 791 301 1052 353 1104M762 403 764 386 773 362 772 355 767 349 732 327 708 305 659 274 626 247 593 227 536 176 498 149M609 239 702 302 728 325 769 352 772 363 763 386 761 403M63 389 106 404 174 435 245 441 268 453M268 453 245 441 174 434 106 404 63 388M302 462 268 453M302 462 371 482M371 482 302 462M733 367 668 329 614 283M387 135 347 92 330 59M398 146 439 204M472 224 451 219 439 204M439 204 451 220 472 224M472 224 482 228 511 250M550 276 511 250M511 250 551 277M584 295 595 299 550 276M551 277 584 295M600 304 635 323 653 340 733 367 791 407M805 507 733 513 728 511M229 746 268 706M268 706 296 685 326 675M268 706 296 686 326 675M326 675 407 644 534 622M205 678 103 698 45 695 9 698M205 678 246 666M246 666 205 678M315 645 246 666M315 645 349 634M349 634 315 645M442 591 349 634M728 511 569 524 442 591M906 676 906 654 899 638 844 594M844 596 899 639 906 654 906 677M844 594 740 597 706 602 658 615 597 623 477 644 430 677 401 680 389 688 358 717 344 749M345 751 358 719 387 691 402 681 431 678 477 645 609 622 657 617 707 603 740 598 838 594 844 596M185 733 229 746M137 787 102 817 73 837M198 725 185 732 149 772M321 661 269 684 198 725M321 661 270 684 198 725M528 591 485 599 448 597 391 634 321 661M761 403 759 423 765 529 766 592M768 592 766 476 761 420 762 403M766 592 778 635 779 655 795 737 814 793M815 792 796 737 786 677 780 655 779 636 768 592M534 622 688 598 837 589M344 749 321 787 257 962 234 994M235 994 258 962 320 792 330 772 345 751M803 416 817 447 821 491M827 495 823 490 818 445 809 422 803 415M73 660 87 661 107 670 132 666 180 643 207 622 245 604 268 580 278 573 304 539 334 519 344 506 468 403 478 378 517 343 527 331M527 331 478 377 468 402 344 505 334 518 303 538 277 573 268 579 245 604 206 621 180 643 132 665 107 669 87 660 73 660M8 671 22 673 47 683 96 673 131 680 172 677 182 683 214 723 234 738 285 758 329 761M268 749 247 743 223 730 201 708 182 682 172 676 132 679 96 672 47 682 23 672 8 669M328 760 290 758 276 750 268 749M584 819 552 834 532 852 497 901 487 909 485 919 472 932 464 950 363 1095 353 1104M354 1105 382 1069 534 851 553 834 586 820M555 441 532 431 442 359 421 348M825 444 677 453 660 451 646 443 555 441M444 422 472 454 506 468 601 480 624 480 651 484 688 483M498 149 409 89 378 74 354 51M343 50 374 75 409 93 527 171 570 207 588 225 609 239M829 560 658 571 606 583 528 591M824 510 825 565 830 582 832 623M834 621 827 513M550 280 534 318M688 293 713 311 756 322 771 331 793 332 802 340 834 461 845 594 859 609M872 615 854 605 845 594 835 461 802 339 793 332 772 331 755 322 725 313 705 297 693 295"; // avenidas principales y autopistas (OpenStreetMap), recortadas a la ciudad

  /* ── Zonas canónicas ─────────────────────────────────────────────
     key = nombre visible = valor que viaja en ?barrio=  (sin traducir:
     son nombres propios). svg = polígonos que pinta; at = ancla del pin
     (por defecto, centroide del primer polígono); lbl = lado preferido
     del rótulo (r/l/b/t), lblm = idem en mobile. */
  const ZONAS = [
    { key:'Núñez',         svg:['Nuñez'],                   alias:['nunez'], desc:{ es:'Residencial y verde, sobre el río. Colegios, clubes y el estadio.', pt:'Residencial e verde, à beira do rio. Escolas, clubes e o estádio.', en:'Residential and green, by the river. Schools, clubs and the stadium.' } },
    { key:'Saavedra',      svg:['Saavedra'] },
    { key:'Belgrano',      svg:['Belgrano'],                alias:['belgrano c','belgrano r','bajo belgrano','belgrano chico'], desc:{ es:'Avenidas arboladas, casas y el subte a la puerta.', pt:'Avenidas arborizadas, casas e o metrô à porta.', en:'Tree-lined avenues, houses and the subway at the door.' } },
    { key:'Colegiales',    svg:['Colegiales'] },
    { key:'Palermo',       svg:['Palermo'],                 alias:['palermo soho','palermo hollywood','las canitas','canitas','palermo chico','palermo viejo','palermo nuevo','palermo botanico','botanico'], desc:{ es:'Parques, gastronomía y diseño. Incluye Soho, Hollywood y Las Cañitas.', pt:'Parques, gastronomia e design. Inclui Soho, Hollywood e Las Cañitas.', en:'Parks, dining and design. Includes Soho, Hollywood and Las Cañitas.' } },
    { key:'Recoleta',      svg:['Recoleta'],                alias:['barrio norte'], desc:{ es:'Embajadas, museos y la Buenos Aires clásica, a pasos del centro.', pt:'Embaixadas, museus e a Buenos Aires clássica, a passos do centro.', en:'Embassies, museums and classic Buenos Aires, steps from downtown.' } },
    { key:'Retiro',        svg:['Retiro'], desc:{ es:'Plaza San Martín, torres y la estación. Entre Recoleta y el centro.', pt:'Plaza San Martín, torres e a estação. Entre Recoleta e o centro.', en:'Plaza San Martín, towers and the station. Between Recoleta and downtown.' } },
    { key:'Puerto Madero', svg:['Puerto Madero'],           labelKey:'Puerto Madero:diques', lbl:'r', short:'P. Madero', desc:{ es:'Diques, torres y la reserva ecológica. El barrio más nuevo de la ciudad.', pt:'Docas, torres e a reserva ecológica. O bairro mais novo da cidade.', en:'Docks, towers and the ecological reserve. The newest neighbourhood in town.' } },   /* los diques, no la reserva; rótulo hacia el río */
    { key:'Centro',        svg:['San Nicolas','Monserrat'], alias:['microcentro','san nicolas','monserrat','montserrat','tribunales'], labelKey:'San Nicolas+Monserrat', desc:{ es:'Microcentro y Monserrat: oficinas, teatros y el Obelisco.', pt:'Microcentro e Monserrat: escritórios, teatros e o Obelisco.', en:'Microcentro and Monserrat: offices, theatres and the Obelisk.' } },
    { key:'San Telmo',     svg:['San Telmo'], desc:{ es:'Adoquines, anticuarios y la feria de los domingos.', pt:'Paralelepípedos, antiquários e a feira de domingo.', en:'Cobblestones, antiques and the Sunday fair.' } },
    { key:'Villa Crespo',  svg:['Villa Crespo'], short:'V. Crespo', desc:{ es:'Al lado de Palermo, con vida de barrio y outlets.', pt:'Ao lado de Palermo, com vida de bairro e outlets.', en:'Next to Palermo, with neighbourhood life and outlet stores.' } },
    { key:'Chacarita',     svg:['Chacarita'] },
    { key:'Almagro',       svg:['Almagro'], at:[556,524], lbl:'b', desc:{ es:'Tango, cafés y la Avenida Corrientes. Bien conectado por subte.', pt:'Tango, cafés e a Avenida Corrientes. Bem conectado por metrô.', en:'Tango, cafés and Corrientes Avenue. Well connected by subway.' } },
    { key:'Balvanera',     svg:['Balvanera'],               alias:['once','congreso'] },
    { key:'Caballito',     svg:['Caballito'] },
    { key:'Villa Urquiza', svg:['Villa Urquiza'] },
    /* Fuera de CABA: sin polígono; si hay inventario aparece un pin al norte. */
    { key:'GBA Norte',     svg:[], alias:['san isidro','vicente lopez','olivos','martinez','acassuso','la lucila','beccar','san fernando','tigre','nordelta'], at:[300,40], offmap:true, desc:{ es:'San Isidro, Vicente López y Olivos: casas, río y colegios.', pt:'San Isidro, Vicente López e Olivos: casas, rio e escolas.', en:'San Isidro, Vicente López and Olivos: houses, river and schools.' } }
  ];

  const norm = s => (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const SVG_BY_NORM = {};
  Object.keys(PATHS).forEach(n => { SVG_BY_NORM[norm(n)] = n; });

  const ALIAS = {};
  ZONAS.forEach(z => {
    ALIAS[norm(z.key)] = z.key;
    (z.svg || []).forEach(s => { ALIAS[norm(s)] = z.key; });
    (z.alias || []).forEach(a => { ALIAS[norm(a)] = z.key; });
  });

  /* barrio (texto libre de Supabase) → zona canónica, o null si no se conoce.
     Sin alias explícito, si coincide con un barrio oficial la zona es ese barrio. */
  function zonaDe(barrio) {
    const n = norm(barrio);
    if (!n) return null;
    if (ALIAS[n]) return ALIAS[n];
    if (SVG_BY_NORM[n]) return SVG_BY_NORM[n];
    return null;
  }

  function contar(props) {
    const c = {};
    (props || []).forEach(p => {
      const z = zonaDe(p && p.barrio);
      if (z) c[z] = (c[z] || 0) + 1;
    });
    return c;
  }

  function zonaConfig(key) {
    let z = ZONAS.find(z => z.key === key);
    if (!z && PATHS[key]) z = { key, svg:[key] };   // barrio oficial sin config explícita
    return z || null;
  }

  /* Punto de rótulo de la zona: polylabel (el punto más lejano de los bordes),
     así el nombre queda adentro del área como en un mapa de verdad. */
  function anclaDe(z) {
    if (z.at) return z.at;
    const lk = z.labelKey || ((z.svg || []).length === 1 ? z.svg[0] : null);
    if (lk && LABELS[lk]) return [LABELS[lk][0], LABELS[lk][1]];
    const pts = (z.svg || []).map(s => LABELS[s] || CENT[s]).filter(Boolean);
    if (!pts.length) return [500, 550];
    return [pts.reduce((a,p)=>a+p[0],0)/pts.length, pts.reduce((a,p)=>a+p[1],0)/pts.length];
  }

  window.BairenZonas = {
    zonaDe, contar, zonaConfig,
    desc: (key, lang) => { const z = zonaConfig(key); const d = z && z.desc; return d ? (d[lang] || d.es) : ''; },
    lista: () => ZONAS.filter(z => !z.offmap).map(z => z.key).concat(['GBA Norte'])
  };

  /* ── Textos (ES/PT/EN) ───────────────────────────────────────────── */
  const T = {
    es: { one:'unidad',  many:'unidades', aria:'Ver {n} en {b}' },
    pt: { one:'unidade', many:'unidades', aria:'Ver {n} em {b}' },
    en: { one:'unit',    many:'units',    aria:'See {n} in {b}' }
  };
  const nLabel = (n, lang) => n + ' ' + (n === 1 ? T[lang].one : T[lang].many);

  /* ── Pin: el logo real de BAIREN (el mismo del nav) ─────────────── */
  const LOGO_SRC = '/bairen_logo.png?v=3';
  const LOGO = '<img class="bm-logo" src="' + LOGO_SRC + '" alt="" draggable="false" decoding="async">';

  /* ── CSS del componente (inyectado una sola vez) ─────────────────── */
  const CSS = `
.bm{--bm-gold:#C2A968;--bm-gold-light:#DECDA0;--bm-navy:#131D2D;--bm-ease:cubic-bezier(.23,1,.32,1);--bm-pin:34px;
  position:relative;width:100%;margin:0 auto;font-family:'Jost',sans-serif;user-select:none;-webkit-user-select:none;}
.bm-stage{position:relative;width:100%;touch-action:none;cursor:grab;}
.bm-stage.is-dragging{cursor:grabbing;}
.bm-stage.is-dragging .bm-pin{pointer-events:none;}
.bm-svg{display:block;width:100%;height:100%;overflow:visible;
  -webkit-mask-image:linear-gradient(to right,transparent 0,#000 20%),linear-gradient(to top,transparent 0,#000 18%),linear-gradient(to bottom,transparent 0,#000 9%),linear-gradient(to left,transparent 0,#000 7%);
  mask-image:linear-gradient(to right,transparent 0,#000 20%),linear-gradient(to top,transparent 0,#000 18%),linear-gradient(to bottom,transparent 0,#000 9%),linear-gradient(to left,transparent 0,#000 7%);
  -webkit-mask-composite:source-in;mask-composite:intersect;}
.bm-water{fill:url(#bmWater);pointer-events:none;}
.bm-outline{fill:url(#bmLand);stroke:rgba(194,169,104,.5);stroke-width:1.2;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none;}
.bm-av{fill:none;stroke:rgba(222,205,160,.17);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none;}
.bm-b{fill:none;stroke:rgba(194,169,104,.17);stroke-width:1;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none;transition:fill .2s ease,stroke .2s ease;}
.bm-b.has{fill:rgba(194,169,104,.075);stroke:rgba(194,169,104,.55);pointer-events:auto;cursor:pointer;}
.bm-b.has.hov{fill:rgba(194,169,104,.16);stroke:rgba(222,205,160,.8);}
.bm-b.has.act{fill:rgba(194,169,104,.24);stroke:rgba(222,205,160,.9);}
.bm-rio{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:25px;letter-spacing:.08em;fill:var(--bm-gold-light);opacity:.55;pointer-events:none;}
.bm-pin{position:absolute;width:var(--bm-pin);height:var(--bm-pin);margin:calc(var(--bm-pin) / -2) 0 0 calc(var(--bm-pin) / -2);padding:0;border:0;background:none;cursor:pointer;border-radius:50%;
  filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));transition:transform .18s var(--bm-ease);-webkit-tap-highlight-color:transparent;}
@media(hover:hover) and (pointer:fine){.bm-pin:hover,.bm-pin.hov{transform:scale(1.08);}}
.bm-pin:active{transform:scale(.96);}
.bm-pin:focus-visible{outline:2px solid var(--bm-gold-light);outline-offset:3px;}
.bm-logo{display:block;width:100%;height:100%;border-radius:50%;box-shadow:0 0 0 0 rgba(222,205,160,0);transition:box-shadow .2s ease;}
.bm-pin.hov .bm-logo,.bm-pin.act .bm-logo{box-shadow:0 0 0 2px var(--bm-gold-light);}
.bm-pin.act{transform:scale(1.06);}
.bm-n{display:none;position:absolute;top:-5px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--bm-gold);color:var(--bm-navy);
  font-size:.58rem;font-weight:600;line-height:16px;text-align:center;letter-spacing:0;box-shadow:0 0 0 2px var(--bm-navy);}
.bm-lbl{position:absolute;white-space:nowrap;line-height:1.15;pointer-events:none;
  text-shadow:0 0 8px var(--bm-navy),0 0 3px var(--bm-navy),0 1px 2px var(--bm-navy);}
.bm-lbl b{display:block;font-weight:500;font-size:.76rem;letter-spacing:.07em;text-transform:uppercase;color:#FBFAF6;}
.bm-lbl i{display:block;font-style:normal;font-weight:400;font-size:.69rem;letter-spacing:.04em;color:var(--bm-gold-light);opacity:.85;margin-top:2px;}
.bm-lbl.is-hidden{visibility:hidden;}
@media(hover:hover) and (pointer:fine){.bm-pin.hov .bm-lbl.is-hidden,.bm-pin:hover .bm-lbl.is-hidden{visibility:visible;}}
.bm-pin--r .bm-lbl{left:calc(100% + 8px);top:50%;transform:translateY(-50%);text-align:left;}
.bm-pin--l .bm-lbl{right:calc(100% + 8px);top:50%;transform:translateY(-50%);text-align:right;}
.bm-pin--b .bm-lbl{top:calc(100% + 5px);left:50%;transform:translateX(-50%);text-align:center;}
.bm-pin--t .bm-lbl{bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);text-align:center;}
/* Mobile: nombre adentro del área (más chico), número en el pin */
@media(max-width:640px){
  .bm{--bm-pin:26px;}
  .bm-n{display:block;min-width:14px;height:14px;line-height:14px;font-size:.52rem;top:-4px;right:-5px;padding:0 3px;}
  .bm-lbl i{display:none;}
  .bm-lbl b{font-size:.625rem;letter-spacing:.07em;}
  .bm-pin--b .bm-lbl{top:calc(100% + 3px);}
  .bm-pin--t .bm-lbl{bottom:calc(100% + 3px);}
  .bm-pin--r .bm-lbl{left:calc(100% + 6px);} .bm-pin--l .bm-lbl{right:calc(100% + 6px);}
  .bm-rio{font-size:27px;}
}
@media(prefers-reduced-motion:reduce){.bm-pin,.bm-b,.bm-logo{transition:none;}}
`;

  function injectCSS() {
    if (document.getElementById('bm-css')) return;
    const s = document.createElement('style'); s.id = 'bm-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  const SIDES = ['r', 'l', 'b', 't'];
  function intersects(a, b, m) {
    m = m || 0;
    return !(a.right + m < b.left || a.left - m > b.right || a.bottom + m < b.top || a.top - m > b.bottom);
  }

  /* ── Componente ──────────────────────────────────────────────────── */
  function mount(el, opts) {
    opts = opts || {};
    injectCSS();
    let counts = opts.counts || {};
    let lang   = opts.lang || window.BAIREN_LANG || 'es';
    let active = opts.active || null;
    let view   = [VB[0], VB[1], VB[2], VB[3]];
    let entered = false;
    const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    el.classList.add('bm');
    el.innerHTML = '<div class="bm-stage"><svg class="bm-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"></svg><div class="bm-pins"></div></div>';
    const stage = el.querySelector('.bm-stage');
    const svg   = el.querySelector('.bm-svg');
    const pins  = el.querySelector('.bm-pins');
    const isNarrow = () => stage.clientWidth < 520;

    const modo = opts.modo || 'completo';     // 'completo' (silueta + zonas + rótulos) | 'lite' (silueta + pins)
    if (modo === 'lite') el.classList.add('bm--lite');
    // Profundidad: el agua brilla apenas junto a la costa y la tierra es un tono más clara
    svg.innerHTML = '<defs>'
      + '<radialGradient id="bmWater" gradientUnits="userSpaceOnUse" cx="830" cy="230" r="360"><stop offset="0" stop-color="#7FA0D8" stop-opacity=".17"/><stop offset=".5" stop-color="#5C7DB8" stop-opacity=".07"/><stop offset="1" stop-color="#3E5A8C" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="bmLand" cx="62%" cy="42%" r="70%"><stop offset="0" stop-color="#FBFAF6" stop-opacity=".075"/><stop offset="1" stop-color="#FBFAF6" stop-opacity=".03"/></radialGradient>'
      + '</defs>';
    const water = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    water.setAttribute('class', 'bm-water'); water.setAttribute('x', -400); water.setAttribute('y', -400); water.setAttribute('width', 1800); water.setAttribute('height', 1900);
    svg.appendChild(water);
    if (OUTLINE) {
      const o = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      o.setAttribute('d', OUTLINE); o.setAttribute('class', 'bm-outline');
      svg.appendChild(o);
    }
    if (AVENIDAS) {
      const av = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      av.setAttribute('d', AVENIDAS); av.setAttribute('class', 'bm-av');
      svg.appendChild(av);
    }
    // Polígonos: uno por barrio oficial (solo se ven los de zonas con inventario)
    const pathEls = {};
    Object.keys(PATHS).forEach(name => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', PATHS[name]);
      p.setAttribute('class', 'bm-b');
      p.dataset.barrio = name;
      svg.appendChild(p);
      pathEls[name] = p;
    });

    // Río de la Plata: rótulo cartográfico sobre la costa
    const rio = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rio.setAttribute('class', 'bm-rio');
    rio.setAttribute('text-anchor', 'middle');
    rio.setAttribute('transform', 'translate(' + RIO.x + ' ' + RIO.y + ') rotate(' + RIO.rot + ')');
    rio.textContent = 'Río de la Plata';
    svg.appendChild(rio);

    const zonaDeSvg = {};   // nombre svg → zona (hover/click sobre el polígono)
    const pinEls = {};

    function pathsOf(key) {
      const z = zonaConfig(key);
      return z ? (z.svg || []).map(s => pathEls[s]).filter(Boolean) : [];
    }

    function hover(key, on) {
      pathsOf(key).forEach(p => p.classList.toggle('hov', on));
      if (pinEls[key]) pinEls[key].classList.toggle('hov', on);
      if (opts.onHover) opts.onHover(on ? key : null);
    }

    function select(key) {
      if (opts.onSelect) opts.onSelect(key);
    }

    function applyActive() {
      Object.keys(pathEls).forEach(n => pathEls[n].classList.remove('act'));
      Object.keys(pinEls).forEach(k => pinEls[k].classList.remove('act'));
      if (active) {
        pathsOf(active).forEach(p => p.classList.add('act'));
        if (pinEls[active]) pinEls[active].classList.add('act');
      }
    }

    function pct(x, y) {
      return [ (x - view[0]) / view[2] * 100, (y - view[1]) / view[3] * 100 ];
    }

    function computeView() {
      const keys = Object.keys(counts).filter(k => counts[k] > 0);
      if (!keys.length) { view = [VB[0], VB[1], VB[2], VB[3]]; return; }
      // Encuadre: bbox de los polígonos con inventario + margen para pins y rótulos.
      const narrow = isNarrow();
      const padX = narrow ? 40 : 70, padY = narrow ? 40 : 60;
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      keys.forEach(k => {
        const z = zonaConfig(k); if (!z) return;
        const a = anclaDe(z);
        x0=Math.min(x0,a[0]-120); x1=Math.max(x1,a[0]+120);
        y0=Math.min(y0,a[1]-70);  y1=Math.max(y1,a[1]+70);
        (z.svg||[]).forEach(s => {
          let b = null;
          try { b = pathEls[s] && pathEls[s].getBBox(); } catch (e) {}
          if (!b || !b.width) return;
          x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.width); y1=Math.max(y1,b.y+b.height);
        });
      });
      x0=Math.max(VB[0],x0-padX); y0=Math.max(VB[1],y0-padY);
      x1=Math.min(VB[0]+VB[2],x1+padX); y1=Math.min(VB[1]+VB[3],y1+padY);
      view = [x0, y0, x1-x0, y1-y0];
    }

    function setSide(pin, side) {
      SIDES.forEach(s => pin.classList.remove('bm-pin--' + s));
      pin.classList.add('bm-pin--' + side);
    }

    /* Colocación de rótulos: por orden de inventario (los grandes eligen
       primero), cada rótulo prueba su lado preferido y luego r/l/b/t;
       toma el primero que no toca otro pin ni otro rótulo y queda dentro
       de la ventana. Si ninguno entra, se oculta (queda el badge). */
    function placeLabels() {
      const keys = Object.keys(pinEls).sort((a, b) => counts[b] - counts[a]);
      if (!keys.length) return;
      const narrow = isNarrow();
      const vw = document.documentElement.clientWidth;
      const pinRects = {};
      keys.forEach(k => { pinRects[k] = pinEls[k].getBoundingClientRect(); });
      const placed = [];
      keys.forEach(k => {
        const pin = pinEls[k], lbl = pin.querySelector('.bm-lbl');
        const z = zonaConfig(k) || {};
        const pref = (narrow && z.lblm) || z.lbl || 'b';
        const tries = [pref].concat(['b','r','l','t'].filter(s => s !== pref));
        const nameEl = lbl.querySelector('b');
        const names = [k].concat(z.short ? [z.short] : []);
        let ok = false;
        for (let n = 0; n < names.length && !ok; n++) {
          nameEl.textContent = names[n];
          for (let i = 0; i < tries.length; i++) {
            setSide(pin, tries[i]);
            const r = lbl.getBoundingClientRect();
            const inView = r.left >= 4 && r.right <= vw - 4;
            const hitPin = keys.some(o => o !== k && intersects(r, pinRects[o], 2));
            const hitLbl = placed.some(p => intersects(r, p, 3));
            if (inView && !hitPin && !hitLbl) { ok = true; placed.push(r); break; }
          }
        }
        if (!ok) { nameEl.textContent = k; setSide(pin, pref); }
        lbl.classList.toggle('is-hidden', !ok);
      });
    }

    function render() {
      computeView();
      base = view.slice();
      svg.setAttribute('viewBox', view.join(' '));
      stage.style.aspectRatio = (view[2] / view[3]).toFixed(4);

      Object.keys(pathEls).forEach(n => { pathEls[n].classList.remove('has'); delete zonaDeSvg[n]; });
      Object.keys(counts).forEach(k => {
        if (!(counts[k] > 0)) return;
        pathsOf(k).forEach(p => { p.classList.add('has'); zonaDeSvg[p.dataset.barrio] = k; });
      });

      pins.innerHTML = '';
      Object.keys(pinEls).forEach(k => delete pinEls[k]);
      const narrowNow = isNarrow();
      const scale = (stage.clientWidth || 1) / view[2];                 // px por unidad de mapa
      const LBLH = narrowNow ? 11 : 26, GAP = narrowNow ? 3 : 5;
      const pinPx = n => narrowNow ? (n >= 6 ? 30 : n >= 2 ? 26 : 24) : (n >= 6 ? 38 : n >= 2 ? 34 : 30);
      Object.keys(counts).filter(k => counts[k] > 0).forEach(k => {
        const z = zonaConfig(k); if (!z) return;
        const a = anclaDe(z);
        const pref = (narrowNow && z.lblm) || z.lbl || 'b';
        // con el nombre debajo, el logo sube para que el conjunto quede centrado en el punto de rótulo
        const PIN = pinPx(counts[k]);
        const up = pref === 'b' ? (PIN / 2 + GAP + LBLH / 2) / scale : 0;
        const [px, py] = pct(a[0], a[1] - up);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bm-pin bm-pin--' + pref;
        b.style.left = px.toFixed(2) + '%';
        b.style.top  = py.toFixed(2) + '%';
        b.style.setProperty('--bm-pin', PIN + 'px');
        b._a = a; b._offPx = pref === 'b' ? (PIN / 2 + GAP + LBLH / 2) : 0;
        b.dataset.zona = k;
        const n = nLabel(counts[k], lang);
        b.setAttribute('aria-label', T[lang].aria.replace('{n}', n).replace('{b}', k));
        b.innerHTML = LOGO
          + '<span class="bm-n" aria-hidden="true">' + counts[k] + '</span>'
          + '<span class="bm-lbl" aria-hidden="true"><b>' + k + '</b><i>' + n + '</i></span>';
        b.addEventListener('mouseenter', () => hover(k, true));
        b.addEventListener('mouseleave', () => hover(k, false));
        b.addEventListener('focus', () => hover(k, true));
        b.addEventListener('blur',  () => hover(k, false));
        b.addEventListener('click', () => select(k));
        pins.appendChild(b);
        pinEls[k] = b;
      });
      applyActive();
      placeLabels();

      // Entrada: los polígonos aparecen y los pins llegan escalonados (solo la primera vez)
      if (!entered && Object.keys(pinEls).length && svg.animate) {
        entered = true;
        svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
        Object.keys(pinEls).forEach((k, i) => {
          const from = REDUCED ? { opacity: 0 } : { opacity: 0, transform: 'scale(.9)' };
          const to   = REDUCED ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' };
          pinEls[k].animate([from, to], { duration: 420, delay: 180 + i * 45, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' });
        });
      }
    }

    /* ── Cámara: arrastrar con un dedo (o el mouse), pellizcar para acercar, doble toque para
       acercar/volver. Se mueve el viewBox del svg y se reposicionan los pins, así logos y
       nombres mantienen su tamaño. Límites: 1x a 3x, sin salirse del mapa. ── */
    let base = view.slice();
    const ptrs = new Map();
    let startView = null, startPt = null, startDist = 0, startMid = null, moved = false, suppressClick = false, lastTap = 0, lastTapPt = null;
    const ZMAX = 3, PAD = 60;

    /* Zoom: desde la ciudad entera (alejar) hasta 3x sobre el encuadre inicial (acercar) */
    function clampView(v) {
      const minW = base[2] / ZMAX;
      const maxW = Math.max(base[2], VB[2] * 1.12, VB[3] * 1.12 * base[2] / base[3]);
      v[2] = Math.min(maxW, Math.max(minW, v[2]));
      v[3] = v[2] * base[3] / base[2];
      // dentro del mapa; si el encuadre es más grande que el mapa, se centra
      if (v[2] >= VB[2] + 2 * PAD) v[0] = VB[0] + (VB[2] - v[2]) / 2;
      else v[0] = Math.min(VB[0] + VB[2] + PAD - v[2], Math.max(VB[0] - PAD, v[0]));
      if (v[3] >= VB[3] + 2 * PAD) v[1] = VB[1] + (VB[3] - v[3]) / 2;
      else v[1] = Math.min(VB[1] + VB[3] + PAD - v[3], Math.max(VB[1] - PAD, v[1]));
      return v;
    }
    function applyCam() {
      svg.setAttribute('viewBox', view.join(' '));
      const scale = (stage.clientWidth || 1) / view[2];
      Object.keys(pinEls).forEach(k => {
        const b = pinEls[k]; if (!b._a) return;
        const [px, py] = pct(b._a[0], b._a[1] - b._offPx / scale);
        b.style.left = px.toFixed(2) + '%'; b.style.top = py.toFixed(2) + '%';
        // fuera del encuadre no se dibuja (si no, flotaría sobre el resto de la página)
        b.style.visibility = (px < -4 || px > 104 || py < -4 || py > 104) ? 'hidden' : '';
      });
    }
    function zoomAt(clientX, clientY, factor) {
      const r = stage.getBoundingClientRect();
      const fx = (clientX - r.left) / r.width, fy = (clientY - r.top) / r.height;
      const mx = view[0] + fx * view[2], my = view[1] + fy * view[3];
      const w = view[2] / factor, h = w * base[3] / base[2];
      view = clampView([mx - fx * w, my - fy * h, w, h]);
      applyCam();
    }
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid  = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    let tapOnPin = false;
    stage.addEventListener('pointerdown', e => {
      if (opts.pan === false || e.button > 0) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      tapOnPin = !!(e.target && e.target.closest && e.target.closest('.bm-pin'));
      startView = view.slice(); moved = false;
      if (ptrs.size === 1) startPt = { x: e.clientX, y: e.clientY };
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; startDist = dist(a, b); startMid = mid(a, b); }
    });
    stage.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = stage.getBoundingClientRect();
      if (ptrs.size === 1) {
        const dx = e.clientX - startPt.x, dy = e.clientY - startPt.y;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        if (!moved) { ptrs.forEach((_, id) => { try { stage.setPointerCapture(id); } catch (err) {} }); }
        moved = true; stage.classList.add('is-dragging');
        const scale = r.width / startView[2];
        view = clampView([startView[0] - dx / scale, startView[1] - dy / scale, startView[2], startView[3]]);
        applyCam();
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = dist(a, b), m = mid(a, b);
        if (!startDist) { startDist = d; startMid = m; startView = view.slice(); return; }
        if (!moved) { ptrs.forEach((_, id) => { try { stage.setPointerCapture(id); } catch (err) {} }); }
        moved = true; stage.classList.add('is-dragging');
        const z = d / startDist;
        const w = startView[2] / z, h = w * base[3] / base[2];
        // el punto del mapa que estaba bajo el centro del pellizco sigue bajo el centro actual
        const fx0 = (startMid.x - r.left) / r.width, fy0 = (startMid.y - r.top) / r.height;
        const mx = startView[0] + fx0 * startView[2], my = startView[1] + fy0 * startView[3];
        const fx1 = (m.x - r.left) / r.width, fy1 = (m.y - r.top) / r.height;
        view = clampView([mx - fx1 * w, my - fy1 * h, w, h]);
        applyCam();
      }
    });
    function endPointer(e) {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 1) { const [a] = [...ptrs.values()]; startPt = { x: a.x, y: a.y }; startView = view.slice(); startDist = 0; }
      if (ptrs.size === 0) {
        stage.classList.remove('is-dragging');
        if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); placeLabels(); }
        else if (!tapOnPin) {
          // doble toque (fuera de un pin): acercar 2x sobre el punto, o volver al encuadre inicial
          const now = Date.now();
          if (lastTapPt && now - lastTap < 320 && dist(lastTapPt, { x: e.clientX, y: e.clientY }) < 24) {
            lastTap = 0;
            if (Math.abs(view[2] - base[2]) > base[2] * 0.01) { view = base.slice(); applyCam(); } else zoomAt(e.clientX, e.clientY, 2);
            placeLabels();
            suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
          } else { lastTap = now; lastTapPt = { x: e.clientX, y: e.clientY }; }
        }
      }
    }
    stage.addEventListener('wheel', e => {
      if (opts.pan === false || !e.ctrlKey) return;      // el scroll normal de la página no se toca
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      clearTimeout(stage._wheelT); stage._wheelT = setTimeout(placeLabels, 120);
    }, { passive: false });
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    // Hover / click sobre polígonos con inventario
    svg.addEventListener('mouseover', e => {
      const n = e.target && e.target.dataset && e.target.dataset.barrio;
      if (n && zonaDeSvg[n]) hover(zonaDeSvg[n], true);
    });
    svg.addEventListener('mouseout', e => {
      const n = e.target && e.target.dataset && e.target.dataset.barrio;
      if (n && zonaDeSvg[n]) hover(zonaDeSvg[n], false);
    });
    svg.addEventListener('click', e => {
      const n = e.target && e.target.dataset && e.target.dataset.barrio;
      if (n && zonaDeSvg[n]) select(zonaDeSvg[n]);
    });

    // Resize: si cambia mobile ↔ desktop se re-encuadra; si no, solo se recolocan rótulos
    let lastNarrow = null, lastW = 0, raf = null;
    function onResize() {
      const w = stage.clientWidth;
      if (w === lastW) return;
      lastW = w;
      const narrow = isNarrow();
      const full = narrow !== lastNarrow;
      lastNarrow = narrow;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(full ? render : placeLabels);
    }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
    else window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLabels);
    document.addEventListener('bairen:lang', () => { const l = window.BAIREN_LANG || 'es'; if (l !== lang) { lang = l; render(); } });

    render();
    lastNarrow = isNarrow(); lastW = stage.clientWidth;

    return {
      setCounts(c) { counts = c || {}; render(); },
      setLang(l)   { lang = l; render(); },
      setActive(k) { active = k || null; applyActive(); },
      refresh: render
    };
  }

  window.BairenMapa = { mount, VIEWBOX: VB };
})();
