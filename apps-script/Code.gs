/**
 * PLATAFORMA ACADÉMICA · Seminario Teológico Bautista de Cuba Oriental
 * UN SOLO ARCHIVO para todo: asignaturas, anuncios, directorio, malla curricular,
 * calendario académico y autenticación (estudiantes + rector, decano y secretaría).
 *
 * INSTALACIÓN
 *  1. Crea una hoja de Google (sheets.new). Déjala PRIVADA (contiene las cuentas).
 *  2. Extensiones → Apps Script → pega TODO este archivo → Guardar.
 *  3. (Recomendado) cambia las 3 claves de CONFIG.CLAVES por otras tuyas.
 *  4. Ejecuta la función «configurarHoja» (acepta los permisos). Crea las 6 hojas y carga
 *     la malla, el directorio y las cuentas de los estudiantes.
 *  5. Implementar → Nueva implementación → Aplicación web → Ejecutar como: Yo ·
 *     Acceso: Cualquier usuario. Copia la URL /exec en js/config.js de la página.
 *  Si cambias este código: Implementar → Administrar implementaciones → Editar → Nueva versión.
 *
 * PERMISOS (edita ENTIDADES más abajo si quieres cambiarlos)
 *   Rectoría   : anuncios (todos), asignaturas, directorio, calendario.
 *   Decanato   : malla curricular (exclusivo), calendario, asignaturas, sus anuncios.
 *   Secretaría : directorio, asignaturas, sus anuncios.
 *   Estudiante : solo lectura (y cambiar su contraseña).
 */
const CONFIG = {
  CLAVES: { rector: 'rector-kmczyts', decano: 'decano-sw7gfv3', secretaria: 'secretaria-kmp9fke' },
  HORAS_SESION: 8,
  ID_HOJA_CALCULO: ''            // vacío si el script se creó desde la hoja
};
const ROLES = { rector: 'Rectoría', decano: 'Decanato', secretaria: 'Secretaría', estudiante: 'Estudiante' };
const TODOS = ['rector', 'decano', 'secretaria'];

// campo: [clave, encabezado, máx. caracteres, obligatorio, tipo]   tipos: url · email · date · largo · bool · enum:A,B
const ENTIDADES = {
  asignaturas: { hoja: 'Asignaturas',
    campos: [['nombre', 'Asignatura', 80, 1], ['profesor', 'Profesor', 80, 1], ['enlace', 'Enlace', 500, 1, 'url']],
    perm: { crear: TODOS, editar: TODOS, eliminar: ['rector', 'decano'] } },
  anuncios: { hoja: 'Anuncios', propios: true, rol: true,
    campos: [['titulo', 'Título', 120, 1], ['mensaje', 'Mensaje', 2000, 1, 'largo'], ['categoria', 'Categoría', 20, 0, 'enum:General,Importante,Urgente'], ['fijado', 'Fijado', 5, 0, 'bool']],
    perm: { crear: TODOS, editar: TODOS, eliminar: TODOS } },
  directorio: { hoja: 'Directorio',
    campos: [['tipo', 'Tipo', 20, 1, 'enum:Administrativo,Docente'], ['nombre', 'Nombre', 100, 1], ['cargo', 'Cargo / Grado', 100], ['materias', 'Asignaturas', 300], ['correo', 'Correo', 200, 0, 'email'], ['telefono', 'Teléfono', 60], ['sede', 'Sede', 40]],
    perm: { crear: ['rector', 'secretaria'], editar: ['rector', 'secretaria'], eliminar: ['rector', 'secretaria'] } },
  malla: { hoja: 'Malla',
    campos: [['anio', 'Año', 30, 1], ['semestre', 'Semestre', 40, 1], ['asignatura', 'Asignatura', 120, 1], ['creditos', 'Créditos', 10], ['tipo', 'Tipo de curso', 30], ['profesor', 'Profesor', 80]],
    perm: { crear: ['decano'], editar: ['decano'], eliminar: ['decano'] } },
  calendario: { hoja: 'Calendario',
    campos: [['inicio', 'Inicio', 10, 1, 'date'], ['fin', 'Fin', 10, 0, 'date'], ['evento', 'Evento', 140, 1], ['tipo', 'Tipo', 20, 0, 'enum:Docencia,Examen,Receso,Matrícula,Evento,Otro'], ['detalle', 'Detalle', 500, 0, 'largo']],
    perm: { crear: ['rector', 'decano'], editar: ['rector', 'decano'], eliminar: ['rector', 'decano'] } }
};
const COL_USUARIOS = ['Usuario', 'Nombre', 'Grupo', 'Sal', 'Huella', 'Estado'];
const SEMILLA = {"usuarios": [["jose.aguilera", "José A. Aguilera Preval", "1.er año", "32e3b0f7", "6a604ee684e28ca6996a5d6b0dd2df0f798b3d68499b3f0c1cc8a975f999c87c", "Activo"], ["jorge.amarales", "Jorge Amarales Sánchez", "1.er año", "beb365cd", "05c6a05caf24ee344718525529b9401dce40b7f32059860187aff06b5fdfd16c", "Activo"], ["osmani.cabrera", "Osmani Cabrera Leyva", "1.er año", "4de7dbf8", "881a606ec4a3b511d877d6bcd2756ce905759c63a019e579f6b84fb4d7502ff0", "Activo"], ["mario.comas", "Mario D. Comas Samuel", "1.er año", "2f92f24f", "1215151ae62ffb46229babd3925c15b7b4e39e841f10515ecdcf06c6946d3cfc", "Activo"], ["carlos.correa", "Carlos E. Correa Fernández", "1.er año", "b1d5d92a", "6a514ba79e476fa5cb2ded00ec6d7788238d8d0d6b4006ddced53feb2273c226", "Activo"], ["yoander.cutino", "Yoander Cutiño Martín", "1.er año", "e81f42ad", "79cdf7a17145de34fc1b42f7d833baca1c66fc89cab03a860e053b34342ff966", "Activo"], ["maikel.duran", "Maikel Durán Tur", "1.er año", "3de0409a", "2e629b337efabcd9b530bd5b3bdcea31921158814a56f75912b3b49148621d8b", "Activo"], ["raul.garcia", "Raúl García Gómez", "1.er año", "3c662943", "313641f182981fbeabe235c5f414303503fa9a39de81769a32ea12f1dda6afe3", "Activo"], ["armando.gomez", "Armando Gómez Márquez", "1.er año", "2b98788d", "1d5120a9fa9e62b5b1622dfd173a04eedddc70025b3c534c018edfc01ac914bf", "Activo"], ["duvier.gonzalez", "Duvier González Samuel", "1.er año", "026086d8", "9a2af085770c1d6243cd229ada67a5f380d2b44655bec1eebd57905cb8acf479", "Activo"], ["gelkis.guerra", "Gelkis Guerra Roldán", "1.er año", "523797ed", "4abfa3e193593e4b3cd42f007387e86d482b7175f50a96dddfdc048193b761ab", "Inactivo"], ["adrian.guerra", "Adrián Guerra Sánchez", "1.er año", "3932dbff", "d207565cc54538cf6d2867779476e51513c6b76293e8d5eaaf6641217deac625", "Activo"], ["sandy.guillen", "Sandy Guillen Cerpa", "1.er año", "ebf9358b", "d6d3365020a3f07af8033a0a836ce1144c83647f51121a088f623650724dcb70", "Activo"], ["josue.legra", "Josué Legra Pupo", "1.er año", "8262f126", "331535dbb2f3d240c5de2685b40a4bd82a5653102b65c264e1e2deb8fc50df80", "Activo"], ["yacher.lores", "Yacher R. Lores Aguilera", "1.er año", "592d42e5", "6eaf7193e5115587e8904e0f4c8e5d638def7fd6e3c31bfcd43918a64718c0e6", "Activo"], ["frank.mena", "Frank Mena Santana", "1.er año", "fa5cf943", "35e3d49cf6586c800cc7c02a3f14e87c5c5fcc8f45a95ed41eff829db4b46896", "Activo"], ["lesnier.ortiz", "Lesnier Ortiz Díaz", "1.er año", "8a69be94", "e3497eb7829278c46659c1070cccbb9e1b18aee9bb12dc04483679869ecc28f5", "Activo"], ["usiel.navarro", "Usiel Navarro Rodríguez", "1.er año", "75ddd6c3", "01a092dee4f80569f3fbf8af592b2530f03d55805aafd2f497f7c4ba2d9a6a5b", "Activo"], ["luis.rodriguez", "Luis M.Rodriguez Hernández", "1.er año", "d7033573", "f088b8714b47532e5e0155379e6224d8bc5254db4171f5c9ef64a641e2850019", "Activo"], ["geovanis.samon", "Geovanis Samón Peña", "1.er año", "becad91c", "90a6c04c467d79021950b07f51104e36b4fd2c618ea6144fc56001198f4fc953", "Activo"], ["alexei.savon", "Alexei Savón Gutiérrez", "1.er año", "c78ee7b4", "032300ed57b837ecac90df413f836844485f5053f82013981f184b4ab24094de", "Activo"], ["orlando.aguilar", "Orlando Aguilar Fonseca", "2.º año", "32c67eee", "963ba39a8ac4225d86ba2354e44f8cec7da7953d753acdba2db0b9d9a2d52f7e", "Activo"], ["dennis.almaguer", "Dennis Almaguer George", "2.º año", "0ea03145", "5f1a3c5b79f7f03ce191fc6278a996c668fda08fbf209890c07c4e41288b7c4a", "Activo"], ["leonard.carrera", "Leonard Luis Carrera Castillo", "2.º año", "9ff5f0d1", "994575347e281d462fa08c1e64866e51437af880394899563949dd712976f249", "Activo"], ["amauri.escudero", "Amauri Escudero Guilarte", "2.º año", "19c2f76e", "27569258b9095bd7141b4a791be9468769ed0c87c2de93e02a216f5f4a84a6e4", "Activo"], ["hector.fernandez", "Hector Fernández Valdéz", "2.º año", "65a37c4e", "916b7c519b1adfec914e8a9b10a7570f5e67f7f6ecfc808fca9581c73aaee48b", "Activo"], ["marcos.gonzalez", "Marcos González González", "2.º año", "0e6654a0", "acbb878e709d0f097188b583717ea207e01647dc5a0429541e8f31bd32b3fc36", "Activo"], ["yulin.labrada", "Yulin Labrada Hernández", "2.º año", "262fae50", "2bdc5e22d1a57f7209b8a1ec904dd721723c0c3aa9ffda694a6d958222a48e07", "Activo"], ["alexei.lopez", "Alexei López Lamorú", "2.º año", "6ebe1282", "690ec62d3ccc9ea16ae55e668bc5b6708409c1699cf595cf280d9f791cbbec6a", "Activo"], ["yoanys.luvin", "Yoanys Luvín Delis", "2.º año", "5cde6437", "1e0fe4d7d29ca106a7bf1a842751ede92d035467b34eeb4ebffc156cea137db1", "Activo"], ["joel.martinez", "Joel Favio Martínez Oconor", "2.º año", "b8a7d485", "f6d8981909f66fc069d366eb77e050b916abb75a68ea7d3488374b7fddd20d32", "Activo"], ["yolexis.merencio", "Yolexis Merencio Árias", "2.º año", "942d4b24", "fa9089c818ff6db49ee9c667d51343da53ac410e4c0a208227b8c5c57b961c4a", "Activo"], ["maikel.molina", "Maikel Molina Figueredo", "2.º año", "1a41d6a2", "d56637972f41a99a35dd548788b21578a99940213c01a324e5d10ad3bc320a51", "Activo"], ["midel.pileta", "Midel Pileta Romero", "2.º año", "dc554f0a", "e3a0ea33fa01941dfa266e50006efe7408acd72d8901aa4e81ed9b3cf9e34d51", "Activo"], ["willer.rabilero", "Willer Luis Rabilero Martínez", "2.º año", "d666e807", "5d893e0a5326c67f8e9641fe49975fe108fc611c4caccb09202b7b49ec9cd8a9", "Activo"], ["orley.rodriguez", "Orley Rodríguez Navarro", "2.º año", "dfe5a20d", "7bb62443d60de11d54b0efc41ea398bfcf8f583a6cde0fabac79ce13f495dcb0", "Activo"], ["jolkis.saminon", "Jolkis Samiñon Paumier", "2.º año", "f330d92a", "e3db951925d7f33e798f4465269f52aed5766a0dd6085e2464da29cf154c1317", "Activo"], ["victor.torno", "Victor Torno Mulet", "2.º año", "ef7ccefe", "aa5f8e80f364564b5400735b7ed471b51646025a51a1683ecec3a0aefc512b50", "Activo"], ["rolando.aguilar", "Rolando Aguilar Merayo", "3.er año", "a277b42e", "87d52d818cedefd5fe227b4ffc43b4a42d9e0f4f05f952ce96fb188f8e525b7d", "Activo"], ["gerardo.almenares", "Gerardo Almenares Cardoza", "3.er año", "f4548d39", "a6624477039f6786703a3ea0d66987deabce53d6e52f247feb2ca61fd305699c", "Activo"], ["ronny.babastro", "Ronny Babastro Pérez", "3.er año", "5ca29c1f", "9eb76238d21f70dc8a639b77a09aaf8c5b60aa1eabc79ce61438b550fb8efeb0", "Activo"], ["aldo.benitez", "Aldo Benitez Suarez", "3.er año", "c0cb37fa", "69bc2aa626dc92c982141fa71da353b574415689a4cf87dee482e5277840a804", "Activo"], ["roleydis.cantillo", "Roleydis Cantillo Furones", "3.er año", "905aba33", "6dfdb896484c2332e033b1903be3487e2576e2089833b7b299f57a35fcddbfa6", "Activo"], ["eudis.cardozo", "Eudis Daniel Cardozo Heredia", "3.er año", "0cdd4d1a", "2c9b8d58750e11cafdafd874e08a3b48bb7545c214713fe1b24188b5d9d80a20", "Activo"], ["wilber.carrera", "Wilber Carrera Llorente", "3.er año", "6f45e9b0", "c341cf1000a8ee1be2b1bc0c99360782afd7afeabf4d97ddb944bcb8500b90fe", "Activo"], ["jeremias.cifuentes", "Jeremías M. Cifuentes Latres", "3.er año", "67b7ce86", "a43e4d83d4531ffd57918289ccaf2fca1bdd9f4c5e840deec3116d4d6b8d81ee", "Activo"], ["armando.cutino", "Armando Cutiño Viamontes", "3.er año", "75611dd5", "f8fa46dd9d0e806469c12dac42dcefd09b2bae684306dac99b496ff17dc06eaa", "Activo"], ["jose.estrada", "José Antonio Estrada Castro", "3.er año", "e43bd4bd", "2f60fad193858adba5c88c14c36115d22796e90e7ea69e613b2285bc64d3e050", "Activo"], ["luis.floiran", "Luis Floiran Romero", "3.er año", "048cae56", "0ce836bd73b170a463b31bebb8a7801c1bbc4f0814e2b3e81b5963e5dc63c47b", "Activo"], ["alejandro.foubelo", "Alejandro Antonio Foubelo Ferrer", "3.er año", "e1ffa86f", "07272b3505a2c6e00908a4244268315ddaf5a588873e72dacb6b95446bedafb4", "Activo"], ["angel.garcia", "Angel Gabriel García Cardero", "3.er año", "40954589", "9fb1492504b8fbed287589d64f68b51bcbdfbfb0ab3ab55e717d575752591d1e", "Activo"], ["ruliseidis.legra", "Ruliseidis Legrá Tamayo", "3.er año", "4e840cf4", "21ac22f9c96044e3c57c3171c2ebcb304f2cdd3bc0c0e7d7fe76352fa7134d1a", "Activo"], ["agustin.nicot", "Agustin Nicot Llorente", "3.er año", "75a20dfd", "26412dd7f4d76a3cce551b3f359908eb160afd0f4063d34d61ffdb1e1e32a2bf", "Activo"], ["ilber.pena", "Ilber Peña Gutiérrez", "3.er año", "1e8c64cb", "0a8ffd6c00cc034ac88836be594a3277d26077b63aad324d74b7ab1c92e14d9c", "Activo"], ["reidel.verdecia", "Reidel Verdecia Pino", "3.er año", "9fbc0583", "4dc46d8dff3f5343f9cffc322a9778cdaeb36bf0c4906126f94b2cd9dbad4769", "Activo"], ["david.walter", "David Walter Fis", "3.er año", "7c1ed8de", "9acf0b4cc803e2567632cfd64dd30e62bcbeb9993bacb37d3f461f4850c6b9b9", "Activo"], ["dannier.aldana", "Dannier Aldana Rivero", "4.º año", "3b4f118d", "885e05befacf5d3ba22d0c5d314216ccd82ad36bc7ee437d9a63b27cc6540af4", "Activo"], ["diosmel.dominguez", "Diosmel Domínguez Matos", "4.º año", "182f688a", "da99bd5d5699e172e4fba40e053c0b54ac2720b8ff3ef2feab9e319efa4a273b", "Activo"], ["diosdelkis.hernandez", "Diosdelkis Hernández Cantillo", "4.º año", "efc7c40c", "35c453af7ad281aaa142f8ce7ea056a5be0343f2516f5fd496f885f4b5cd4107", "Activo"], ["mariano.hernandez", "Mariano Hernández Nápoles", "4.º año", "a9368f05", "7e01f4bef83dafbe113a2a3e431ca13d6db3c6c0e01d7c8a280acfc348c955da", "Activo"], ["jose.hernandez", "José Hernández Velázquez", "4.º año", "9604bb7d", "576784986130da13a39c4871eb7b55cf8efcd3ca2621298265c4a6958da768e3", "Activo"], ["elienriel.lobaina", "Elienriel Lobaina Cantillo", "4.º año", "2d6c5214", "d03e872c188f9f118bf2f6275808123cda4dc5d9f85518172b4c50db0121cd8e", "Activo"], ["jaikel.lopez", "Jaikel López Nieto", "4.º año", "035f9dcc", "16b9ac938e9a413f61a68b0741b7c93bc8360059c3e7c909672a4d1e128396e9", "Activo"], ["leonardo.vaillant", "Leonardo Vaillant García", "4.º año", "d371af34", "5eee1d9f36af8c1fa8dc57eddcefb90c76e7c754010c0d1843eae4cd63d4a3c0", "Activo"], ["magdiel.garcias", "Magdiel Garcías Avíles", "Sede Habana · 2.º año", "44033187", "44f9af88aa589f8f7f0a45c8c7f642f580f72eeb0903cde3e99c96235cf69153", "Activo"], ["jose.leyva", "José Antonio Leyva Rigñak", "Sede Habana · 2.º año", "d008820d", "fa335b9269563eba5e37cb1cf2eb7cb84f3a5bdce399d44e6b2166d55b037c92", "Activo"], ["jaider.portales", "Jaider Portales Días", "Sede Habana · 2.º año", "e84caae0", "2f585cf926dcb70c772f780e0e484278fd9183f7ba626d0fbc606fcebdb15aac", "Activo"], ["liuvel.sanchez", "Liuvel Sánchez Campos", "Sede Habana · 2.º año", "54d149f6", "aec0c2b04483d5dc553b167334310b0290e18b935447f8481ed1246914a69028", "Activo"], ["david.hernandez", "David Hernández Galano", "Sede Habana · 3.er año", "f09d941f", "36b5343f65d1b5b2e576cd6a6f62748f7f75bbc789ce755d1e5ae87597a42649", "Activo"], ["elder.pulgar", "Elder Pulgar Valdéz", "Sede Habana · 3.er año", "c8c19bed", "e710935b8224851d45fae1e5c824e8fc28dd8d59d3056fb017b087ec45e01823", "Activo"], ["juan.diaz", "Juan Carlos Díaz Salazar", "Sede Habana · 3.er año", "3ca46dd5", "a90c9f0ba540530a0499d56ca014634934672c4aaf6192299e0d66eb89b5c1b6", "Activo"], ["yeider.pena", "Yeider Peña Samón", "Sede Habana · 3.er año", "b04f5ba3", "998a07a822bb659ad3d1016e62e8d946878c412ee37e08bc038cbc9f3f60be60", "Activo"]], "malla": [["Primer año", "Primer semestre", "Hechos de los apóstoles", "1", "Diploma", "Acner Sánchez"], ["Primer año", "Primer semestre", "Historia y Principios Bautistas y de la CBCOr", "1", "Diploma", "Diorlis Hernández"], ["Primer año", "Primer semestre", "Homilética I", "1", "Diploma", "Amado Ramirez"], ["Primer año", "Primer semestre", "Formación Espiritual I", "2", "Diploma", "Capellán"], ["Primer año", "Primer semestre", "Hermenéutica I", "1", "Diploma", "Manuel Remón"], ["Primer año", "Primer semestre", "Orientación de Minist. Práctico I", "2", "Diploma", "Capellán"], ["Primer año", "Primer semestre", "Introducción AT", "1", "Diploma", "Eduardo Glez"], ["Primer año", "Primer semestre", "Curso electivo (7 Hábitos)", "1", "Diploma", ""], ["Primer año", "Primer semestre", "Evangelismo, discipulado y plantacion de I.", "1", "Diploma", "Marcos Rivero"], ["Primer año", "Segundo semestre", "Teología I (Biblia)", "1", "Diploma", "Alexei Evora"], ["Primer año", "Segundo semestre", "Homilética II", "1", "Diploma", "Amado Ramírez"], ["Primer año", "Segundo semestre", "Formación Espiritual I", "", "Diploma", "Capellán"], ["Primer año", "Segundo semestre", "Orientación de Minist. Práctico I", "", "Diploma", "Capellán"], ["Primer año", "Segundo semestre", "Metodología de la Investigación", "1", "Diploma", "Alsuby Alba"], ["Primer año", "Segundo semestre", "Ministerio Pastoral I", "1", "Diploma", "Eduardo Glez"], ["Primer año", "Segundo semestre", "Teología I (Dios)", "1", "Diploma", "Milton Leyva"], ["Primer año", "Segundo semestre", "Religiones Mundiales y Sectas en Cuba", "1", "Diploma", ""], ["Primer año", "Segundo semestre", "Teología I (Cristo)", "1", "Diploma", "Addiel Hdez"], ["Segundo año", "Primer semestre", "Teología II (Espíritu Santo)", "1", "Diploma", "Michel Morales"], ["Segundo año", "Primer semestre", "Teología II (Hombre)", "1", "Diploma", "George Sotomayor"], ["Segundo año", "Primer semestre", "Ministerio Educativo", "1", "Diploma", "Leidys Durán"], ["Segundo año", "Primer semestre", "Formación Espiritual II", "2", "Diploma", "Capellán"], ["Segundo año", "Primer semestre", "Orientación de Minist. Práctico II", "2", "Diploma", "Capellán"], ["Segundo año", "Primer semestre", "Ministerio Pastoral II", "1", "Diploma", "Eduardo Glez"], ["Segundo año", "Primer semestre", "Ética pastoral", "1", "Diploma", "Manuel Tamayo"], ["Segundo año", "Primer semestre", "Introducción N.T.", "1", "Diploma", "Milton Cadet"], ["Segundo año", "Primer semestre", "Teología (Soteriología)", "1", "Diploma", "Lázaro Gómez"], ["Segundo año", "Primer semestre", "Historia Cristianismo I", "1", "Diploma", "Felix Domínguez"], ["Segundo año", "Segundo semestre", "Liderazgo", "1", "Diploma", "Fernando"], ["Segundo año", "Segundo semestre", "Historia del Crist. II", "1", "Diploma", "Felix Domínguez"], ["Segundo año", "Segundo semestre", "Formación Espiritual II", "", "Diploma", "Capellán"], ["Segundo año", "Segundo semestre", "Orientación de Minist. Práctico II", "", "Diploma", "Capellán"], ["Segundo año", "Segundo semestre", "Hermenéutica II", "1", "Diploma", "Manuel Remón"], ["Segundo año", "Segundo semestre", "Mayordomía", "1", "Lic. y Bach.", "Osiel Matos"], ["Segundo año", "Segundo semestre", "Adoración", "1", "Diploma", "Yunior Hdez"], ["Segundo año", "Segundo semestre", "Consejería bíblica I", "1", "Diploma", "Yoelkis Pérez"], ["Segundo año", "Segundo semestre", "Trabajo de Tesis (1Cr)", "1", "Diploma", "Alsuby Alba"], ["Segundo año", "Segundo semestre", "Teología (Angelología)", "1", "Diploma", "Esteban Glez"], ["Segundo año", "Segundo semestre", "Curso electivo (enseñanzas de Jesús)", "1", "Diploma", "Bill Warren"], ["Segundo año", "Segundo semestre", "Curso electivo (Libros Sapienciales)", "1", "Diploma", "Extranjero"], ["Segundo año", "Segundo semestre", "Libros Historicos", "1", "Diploma", "Freddy De la Fuente"], ["Segundo año", "Segundo semestre", "Ministerio Pastoral III- Práctico", "1", "Diploma", "Josué Rodrz"], ["Tercer año", "Primer semestre", "Idioma Hebreo I", "1", "Bachiller", "Dioelis del Río"], ["Tercer año", "Primer semestre", "Formación Espiritual III", "2", "Bachiller", "Capellán"], ["Tercer año", "Primer semestre", "Orientación de Minist. Práctico III", "2", "Bachiller", "Capellán"], ["Tercer año", "Primer semestre", "Trabajo de Tesis", "1", "Licenciatura", "Alsuby Alba"], ["Tercer año", "Primer semestre", "Homilética III", "1", "Bachiller", "Amado"], ["Tercer año", "Primer semestre", "Teología III (pecado)", "1", "Bachiller", "Michel Morales"], ["Tercer año", "Primer semestre", "Romanos", "1", "Bachiller", "Bill Warren"], ["Tercer año", "Primer semestre", "Apologética", "1", "Bachiller", "Extranjero. Waren"], ["Tercer año", "Primer semestre", "Consejería bíblica II", "1", "Lic. y Bach.", "Yoelkis Pérez"], ["Tercer año", "Primer semestre", "Formación Espiritual III", "", "Bachiller", "Capellán"], ["Tercer año", "Primer semestre", "Orientación de Minist. Práctico III", "", "Bachiller", "Capellán"], ["Tercer año", "Primer semestre", "Idioma Hebreo II", "1", "Bachiller", "Dioelis del Río"], ["Tercer año", "Primer semestre", "Curso Electivo- Literatura Juanina", "1", "", "Bill Warren"], ["Tercer año", "Primer semestre", "Trabajo de Tesis", "1", "Licenciatura", "Alsuby Alba"], ["Tercer año", "Primer semestre", "Teología  III (salvación)", "1", "Bachiller", "Lazaro"], ["Tercer año", "Primer semestre", "Doctrina de la iglesia (eclesiología)", "1", "Bachiller", ""], ["Tercer año", "Primer semestre", "Nociones de Derecho", "1", "Bachiller", "Harry Martínez"], ["Tercer año", "Primer semestre", "Idioma Griego I", "1", "Licenciatura", "Joel Gutiérrez"], ["Tercer año", "Primer semestre", "Español", "1", "Licenciatura", "Olguita"], ["Tercer año", "Primer semestre", "Epistolas Pastorales", "1", "Licenciatura", "Milton Cadet"], ["Cuarto año", "Primer semestre", "Idioma Griego II", "1", "Licenciatura", "Joel Gutiérrez"], ["Cuarto año", "Primer semestre", "Orientación de Minist. Práctico IV", "2", "Licenciatura", "Capellán"], ["Cuarto año", "Primer semestre", "Formación Espiritual IV", "2", "Licenciatura", "Capellán"], ["Cuarto año", "Primer semestre", "Trabajo de Tesis", "1", "Licenciatura", ""], ["Cuarto año", "Primer semestre", "Cultura e Historia Judía", "1", "Licenciatura", "Zoe y Paola"], ["Cuarto año", "Primer semestre", "Predicación expositiva", "1", "Licenciatura", "Phillip Wages"], ["Cuarto año", "Primer semestre", "Escatología", "1", "Licenciatura", "Adrian Alarcón"], ["Cuarto año", "Primer semestre", "Curso electivo (Muerte y Resurreción)", "1", "Licenciatura", "Bill Warren"], ["Cuarto año", "Primer semestre", "Metodología de la Enseñanza", "1", "Licenciatura", "Vitalia de la Torre"], ["Cuarto año", "Segundo semestre", "Formación Espiritual IV", "", "Licenciatura", "Capellán"], ["Cuarto año", "Segundo semestre", "Orientación de Minist. Práctico IV", "", "Licenciatura", "Capellán"], ["Cuarto año", "Segundo semestre", "Curso electivo (Historia Bautista 97)", "1", "Licenciatura", "Extranjero. Warren"], ["Cuarto año", "Segundo semestre", "Curso electivo (Base Biblica de adoración)", "1", "Licenciatura", "Extranjero. Warren"], ["Cuarto año", "Segundo semestre", "Trabajo de Tesis", "2", "Licenciatura", "Alsuby Alba"], ["Cuarto año", "Segundo semestre", "Ejercicio de Culminación de Estudios (Discusión)", "2", "Todos", ""]], "directorio": [["Administrativo", "MA. Joel Gutiérrez Cabrera", "Rector", "", "joelgc242@gmail.com", "53422375", ""], ["Administrativo", "Ms. Alsuby Alba Regalado", "Vicerrector", "", "mifamilia.cuba@gmail.com", "53730375", ""], ["Administrativo", "MA. Amado Ramírez Oliveros", "Preparación Ministerial", "", "amadoyude@gmail.com", "53737647", ""], ["Administrativo", "Diorlis Hernández Hernández", "Capellán", "", "diorlis@nauta.cu", "", ""], ["Administrativo", "Addiel Rodríguez Hernández", "Decano", "", "addiel689@nauta.cu; rodriguezaddiel689@gmail.com", "54257856", ""], ["Administrativo", "Eddy Borrero Fernández", "Administrador", "", "", "", ""], ["Administrativo", "Mariolis García Galindo", "Directora Interna", "", "", "", ""], ["Administrativo", "MA. Vitalia de la Torre Ayala", "Directora Centros Bíblicos", "", "vitaliadelatorreayala@gmail.com", "58996980", ""], ["Administrativo", "Damayanti Sánchez Duharte", "Secretaria Docente", "", "", "", ""], ["Administrativo", "Yeni Evelia Yirat Zapata", "Secretaria Procesadora de Datos", "", "", "", ""], ["Administrativo", "Zoe Del Rio Matos", "Secretaria Centros Bíblicos", "", "", "", ""], ["Docente", "Acner Sánchez Fiffe", "Licenciado", "Hechos de los Apóstoles", "acnersanchez79@gmail.com", "51568518", ""], ["Docente", "Addiel Rodríguez Hernández", "Licenciado", "Cristología", "addiel689@nauta.cu; rodriguezaddiel689@gmail.com", "54257856", ""], ["Docente", "Adrián Arnaldo Alarcón Peralta", "Máster", "Escatología", "", "55129880", ""], ["Docente", "Alexey Evora", "Licenciado", "Bibliología", "", "54077668", ""], ["Docente", "Alsuby Alba Regalado", "Máster", "Metodología de la investigación", "mifamilia.cuba@gmail.com", "53730375", ""], ["Docente", "Amado Ramírez Oliveros", "Máster", "Homilética", "amadoyude@gmail.com", "53737647", ""], ["Docente", "Bill Warren", "PhD", "Parábolas, Literatura Juanina", "", "", ""], ["Docente", "Dailanis Figueroa", "Doctor", "Psicología, Teología, Metodología de la investigación", "", "", "Habana"], ["Docente", "Damaris Rodríguez", "Licenciada", "Español", "", "", "Habana"], ["Docente", "Dioelis Rodríguez del Río", "Máster", "Hebreo 1, Hebreo 2, Libros poéticos, Enseña con Vida", "drdelrio75@gmail.com", "54445167", ""], ["Docente", "Diorlis Hernández Hernández", "Licenciado", "Historia y Principios Bautistas", "diorlis@nauta.cu", "", ""], ["Docente", "Edén Rodríguez", "Licenciado", "Adoración", "", "", "Habana"], ["Docente", "Edgardo Rafael Tamayo Mesa", "Máster", "Doctrina del Espíritu Santo", "", "", ""], ["Docente", "Eisner Noa", "Máster", "Nociones de Derecho", "", "", "Habana"], ["Docente", "Esteban González Toirac", "Máster", "Angelología", "estebangonzaleztoirac@gmail.com", "53632518", ""], ["Docente", "Félix Domínguez", "Licenciado", "Historia del Cristianismo I y II", "rvfelixr@gmail.com", "59350290", ""], ["Docente", "Fernando Flores", "Máster", "Apologética", "", "", "Habana"], ["Docente", "Fernando Labrada", "Licenciado", "Liderazgo", "", "", ""], ["Docente", "Freddy De la Fuente", "Licenciado", "Libros Históricos, Libros Poéticos", "", "52401136", ""], ["Docente", "George Sotomayor Noa", "Máster", "Antropología", "george.sotomayor@nauta.cu; g.sotonoa@gmail.com", "53008224", ""], ["Docente", "Harry Martínez Cala", "Licenciado", "Nociones de Derecho", "harrymc@nauta.cu", "55956593", ""], ["Docente", "Joel Gutiérrez Cabrera", "Máster", "Griego 1 y 2", "joelgc242@gmail.com", "53422375", ""], ["Docente", "John y Brent", "", "Los 7 hábitos", "", "", ""], ["Docente", "José Álvarez", "Máster", "Liderazgo", "", "", "Habana"], ["Docente", "José Néstor Ginarte Vargas", "Licenciado", "Sectas Falsas y Religiones Mundiales", "", "", ""], ["Docente", "Josué Rodríguez", "Licenciado", "Ministerio Práctico", "", "52926342", ""], ["Docente", "Karel Reyes", "Licenciado", "Introducción al Nuevo Testamento", "", "", "Habana"], ["Docente", "Lázaro Gómez Quiala", "Licenciado", "Soteriología, Doctrina de la Salvación", "lazarogomez58@nauta.cu", "54944715", ""], ["Docente", "Lázaro Michel Suárez Cobas", "Licenciado", "Doctrina de Dios, Hermenéutica", "lazarosc2016@gmail.com", "54371772", "Habana"], ["Docente", "Ledian Medina Isaac", "Licenciado", "Libros proféticos", "", "", ""], ["Docente", "Leidys Durán Rodríguez", "Máster", "Ministerio Educativo", "leidysduranrodriguez@gmail.com", "53388308", ""], ["Docente", "Lloyd Harsh", "Doctor", "Historia del Cristianismo", "", "", ""], ["Docente", "Manuel E. Remón Chavez", "MSc. Estudios Teológicos", "Hermenéutica 1 y 2", "remonmanuel@nauta.cu; pastor.mzllo@gmail.com", "52450649", ""], ["Docente", "Manuel Tamayo Córdova", "Licenciado", "Ética cristiana", "mtc@nauta.cu; mt2622677@gmail.com", "52553112", ""], ["Docente", "Marcos Rivero Sinclair", "Licenciado", "Evangelismo y Discipulado", "", "", ""], ["Docente", "Michel Morales Avila", "Licenciado", "Hamartiología, Soteriología", "michelmorales1981@gmail.com", "54074591", ""], ["Docente", "Milton Cadet Brown", "Licenciado", "Epístolas Pastorales", "", "", ""], ["Docente", "Milton Carlos Leyva Pérez", "Licenciado", "Doctrina de Dios", "subditodelreinodelcielo@gmail.com", "54692668", ""], ["Docente", "Olga Sánchez Duharte", "Máster", "Español", "", "", ""], ["Docente", "Onel Pardillo García", "Licenciado", "Introducción al Antiguo Testamento, Hebreo", "prpardillo@gmail.com", "51177688", "Habana"], ["Docente", "Osiel Matos", "Máster", "Mayordomía Integral", "", "", ""], ["Docente", "Rolando Yohamed Desdín García", "Licenciado", "Griego I y II", "rolandodesdin3@outlook.com", "58169444", ""], ["Docente", "Sergio Emilio Tabares Santiesteban", "Licenciado", "Doctrina de la Iglesia", "sergiotabares8901@gmail.com", "55040722", ""], ["Docente", "Sue Haueter", "Máster", "", "", "", ""], ["Docente", "Timoteo Broach", "Profesor ayudante", "Liderazgo, Metodología de la Enseñanza", "tbroach@reachbeyond.org", "", "Habana"], ["Docente", "Vitalia De la Torre Ayala", "Máster", "Metodología de la Enseñanza", "vitaliadelatorreayala@gmail.com", "58996980", ""], ["Docente", "Wilfrido Sánchez Ramírez", "Máster", "Apologética", "wsanchezramirez83@gmail.com", "52400256", ""], ["Docente", "Yoelkis Pérez", "Licenciado", "Consejería", "", "58143724", ""], ["Docente", "Yordanel Navarro", "Lic. Teología", "Doctrina de la Salvación, Hechos de los Apóstoles", "", "", "Habana"], ["Docente", "Yunior Hernández González", "Licenciado", "Adoración", "yuniorhg84@gmail.com", "52447278", ""]]};

/* =============== Menú y configuración =============== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Plataforma STBCOr')
    .addItem('Configurar hojas y cargar datos', 'configurarHoja')
    .addItem('Restablecer contraseña de un estudiante', 'restablecerContrasena')
    .addItem('Agregar estudiante', 'agregarEstudiante').addToUi();
}
function configurarHoja() {
  Object.keys(ENTIDADES).forEach(function (k) { hojaEnt_(k); });
  const us = hojaUsuarios_();
  if (us.getLastRow() < 2) escribir_(us, SEMILLA.usuarios);
  const sem = { directorio: SEMILLA.directorio, malla: SEMILLA.malla };
  Object.keys(sem).forEach(function (k) {
    const sh = hojaEnt_(k);
    if (sh.getLastRow() < 2) sem[k].forEach(function (f) { agregarFila_(k, f); });
  });
  Object.keys(ENTIDADES).map(function (k) { return hojaEnt_(k); }).concat([us]).forEach(proteger_);
  avisar_('Listo: hojas creadas y datos cargados. Ahora implementa el script como aplicación web.');
}
function restablecerContrasena() {
  const ui = SpreadsheetApp.getUi(), r = ui.prompt('Usuario del estudiante (ej.: orlando.aguilar):');
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const sh = hojaUsuarios_(), fila = buscarUsuario_(sh, r.getResponseText());
  if (!fila) return ui.alert('No existe ese usuario.');
  const nueva = generarClave_(), sal = sh.getRange(fila, 4).getValue();
  sh.getRange(fila, 5).setValue(hash_(String(sal), nueva));
  ui.alert('Nueva contraseña para ' + sh.getRange(fila, 1).getValue() + ':\n\n' + nueva + '\n\nEntrégasela al estudiante.');
}
function agregarEstudiante() {
  const ui = SpreadsheetApp.getUi(), n = ui.prompt('Nombre completo del estudiante:'); if (n.getSelectedButton() !== ui.Button.OK) return;
  const g = ui.prompt('Grupo (ej.: 1.er año):'); if (g.getSelectedButton() !== ui.Button.OK) return;
  const t = limpiar_(n.getResponseText(), 100).split(' '), u = quitarAcentos_(t[0] + '.' + (t.length > 3 ? t[2] : t[1])).replace(/[^a-z.]/g, '');
  const sh = hojaUsuarios_(); if (buscarUsuario_(sh, u)) return ui.alert('Ya existe el usuario ' + u + '. Agrégalo a mano con otro nombre de usuario.');
  const clave = generarClave_(), sal = Utilities.getUuid().slice(0, 8);
  escribir_(sh, [[u, limpiar_(n.getResponseText(), 100), limpiar_(g.getResponseText(), 40), sal, hash_(sal, clave), 'Activo']]);
  ui.alert('Cuenta creada.\nUsuario: ' + u + '\nContraseña: ' + clave);
}

/* =============== Entrada web =============== */
function doGet() { return json_({ ok: true, servicio: 'Plataforma académica STBCOr' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (b.accion) {
      case 'login':         return json_(loginEstudiante_(b));
      case 'loginPersonal': return json_(loginPersonal_(b));
    }
    const s = sesion_(b.token);
    if (!s) return json_({ ok: false, code: 'AUTH', error: 'Tu sesión expiró. Vuelve a entrar.' });
    switch (b.accion) {
      case 'datos':        return json_(datos_(s));
      case 'cambiarClave': return json_(cambiarClave_(s, b));
      case 'crear': case 'actualizar': case 'eliminar': return json_(escritura_(s, b));
    }
    return json_({ ok: false, error: 'Acción no válida' });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* =============== Autenticación =============== */
function loginEstudiante_(b) {
  const u = quitarAcentos_(String(b.usuario || '')).trim(), cache = CacheService.getScriptCache(), kf = 'f_' + u;
  if (!u || !b.password) throw new Error('Escribe tu usuario y contraseña');
  if (Number(cache.get(kf) || 0) >= 8) throw new Error('Demasiados intentos. Espera 10 minutos e inténtalo de nuevo.');
  const sh = hojaUsuarios_(), fila = buscarUsuario_(sh, u), msg = 'Usuario o contraseña incorrectos';
  if (!fila) { cache.put(kf, String(Number(cache.get(kf) || 0) + 1), 600); throw new Error(msg); }
  const r = sh.getRange(fila, 1, 1, 6).getValues()[0];
  if (hash_(String(r[3]), String(b.password)) !== String(r[4])) { cache.put(kf, String(Number(cache.get(kf) || 0) + 1), 600); throw new Error(msg); }
  if (String(r[5]) !== 'Activo') throw new Error('Tu cuenta no está activa. Consulta con Secretaría.');
  cache.remove(kf);
  return { ok: true, token: token_({ u: r[0], n: r[1], g: r[2], r: 'estudiante' }) };
}
function loginPersonal_(b) {
  const c = String(b.clave || ''), cache = CacheService.getScriptCache();
  if (Number(cache.get('f_personal') || 0) >= 10) throw new Error('Demasiados intentos. Espera 10 minutos.');
  const rol = TODOS.filter(function (r) { return igual_(c, CONFIG.CLAVES[r]); })[0];
  if (!rol) { cache.put('f_personal', String(Number(cache.get('f_personal') || 0) + 1), 600); throw new Error('Código de acceso incorrecto'); }
  return { ok: true, token: token_({ u: rol, n: ROLES[rol], g: '', r: rol }) };
}
function cambiarClave_(s, b) {
  if (s.r !== 'estudiante') throw new Error('Las claves del personal se cambian en Code.gs');
  const nueva = String(b.nueva || ''); if (nueva.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  const sh = hojaUsuarios_(), fila = buscarUsuario_(sh, s.u); if (!fila) throw new Error('Usuario no encontrado');
  const r = sh.getRange(fila, 1, 1, 6).getValues()[0];
  if (hash_(String(r[3]), String(b.actual || '')) !== String(r[4])) throw new Error('La contraseña actual no es correcta');
  sh.getRange(fila, 5).setValue(hash_(String(r[3]), nueva)); return { ok: true };
}
function secreto_() {
  const p = PropertiesService.getScriptProperties(); let s = p.getProperty('SECRETO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRETO', s); } return s;
}
function token_(d) {
  d.e = Date.now() + CONFIG.HORAS_SESION * 3600000;
  const p = Utilities.base64EncodeWebSafe(JSON.stringify(d));
  return p + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p, secreto_()));
}
function sesion_(t) {
  if (!t || String(t).indexOf('.') < 0) return null;
  const parts = String(t).split('.'), esperado = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], secreto_()));
  if (!igual_(parts[1], esperado)) return null;
  const d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  return d.e > Date.now() ? d : null;
}

/* =============== Datos y permisos =============== */
function permisos_(rol) {
  const o = {};
  Object.keys(ENTIDADES).forEach(function (k) {
    const p = ENTIDADES[k].perm, propios = ENTIDADES[k].propios && rol !== 'rector';
    o[k] = { crear: p.crear.indexOf(rol) >= 0, editar: p.editar.indexOf(rol) >= 0 ? (propios ? 'propios' : 'todos') : false, eliminar: p.eliminar.indexOf(rol) >= 0 ? (propios ? 'propios' : 'todos') : false };
  });
  return o;
}
function esquema_() {
  const o = {};
  Object.keys(ENTIDADES).forEach(function (k) {
    o[k] = ENTIDADES[k].campos.map(function (c) { return { k: c[0], l: c[1], max: c[2], req: !!c[3], t: c[4] || '' }; });
  });
  return o;
}
function datos_(s) {
  const d = {}; Object.keys(ENTIDADES).forEach(function (k) { d[k] = listar_(k); });
  return { ok: true, datos: d, permisos: permisos_(s.r), esquema: esquema_(), sesion: { usuario: s.u, nombre: s.n, grupo: s.g, rol: s.r, etiqueta: ROLES[s.r] } };
}
function escritura_(s, b) {
  const def = ENTIDADES[b.entidad]; if (!def) throw new Error('Sección no válida');
  if (def.perm[{ crear: 'crear', actualizar: 'editar', eliminar: 'eliminar' }[b.accion]].indexOf(s.r) < 0) throw new Error('Tu cargo (' + ROLES[s.r] + ') no tiene permiso para esta acción');
  const sh = hojaEnt_(b.entidad);
  if (b.accion === 'crear') agregarFila_(b.entidad, validar_(def, b.datos || {}), s.r);
  else {
    const fila = buscarFila_(sh, b.id);
    if (def.propios && s.r !== 'rector' && String(sh.getRange(fila, def.campos.length + 2).getValue()) !== s.r) throw new Error('Solo puedes modificar tus propios anuncios');
    if (b.accion === 'eliminar') sh.deleteRow(fila);
    else {
      const v = validar_(def, b.datos || {}), r = sh.getRange(fila, 2, 1, def.campos.length);
      r.setNumberFormat('@').setValues([def.campos.map(function (c) { return v[c[0]]; })]);
      sh.getRange(fila, ncols_(def)).setValue(new Date());
    }
  }
  return { ok: true, lista: listar_(b.entidad) };
}

/* =============== Hojas =============== */
function ncols_(def) { return def.campos.length + (def.rol ? 1 : 0) + 3; }
function ss_() { return CONFIG.ID_HOJA_CALCULO ? SpreadsheetApp.openById(CONFIG.ID_HOJA_CALCULO) : SpreadsheetApp.getActiveSpreadsheet(); }
function crearHoja_(nombre, enc, anchos) {
  const ss = ss_(); let sh = ss.getSheetByName(nombre); if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground('#14385c').setFontColor('#ffffff');
    sh.setFrozenRows(1); (anchos || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function hojaEnt_(k) {
  const d = ENTIDADES[k], enc = ['ID'].concat(d.campos.map(function (c) { return c[1]; }), d.rol ? ['Rol'] : [], ['Creada', 'Actualizada']);
  return crearHoja_(d.hoja, enc, [90].concat(d.campos.map(function (c) { return c[2] > 200 ? 380 : c[2] > 60 ? 240 : 150; })));
}
function hojaUsuarios_() { return crearHoja_('Usuarios', COL_USUARIOS, [150, 260, 160, 90, 420, 90]); }
function escribir_(sh, filas) {
  if (!filas.length) return; const f = sh.getLastRow() + 1;
  sh.getRange(f, 1, filas.length, filas[0].length).setNumberFormat('@').setValues(filas);
}
function agregarFila_(k, v, rol) {
  const def = ENTIDADES[k], sh = hojaEnt_(k), ahora = new Date().toISOString(), f = sh.getLastRow() + 1;
  const vals = Array.isArray(v) ? v : def.campos.map(function (c) { return v[c[0]]; });
  const fila = [Utilities.getUuid()].concat(vals.map(String), def.rol ? [rol || ''] : [], [ahora, ahora]);
  sh.getRange(f, 1, 1, fila.length).setNumberFormat('@').setValues([fila]);
}
function listar_(k) {
  const def = ENTIDADES[k], sh = hojaEnt_(k), n = sh.getLastRow() - 1; if (n < 1) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, n, ncols_(def)).getValues().filter(function (r) { return r[0]; }).map(function (r) {
    const o = { id: String(r[0]) };
    def.campos.forEach(function (c, i) { let x = r[i + 1]; if (x instanceof Date) x = Utilities.formatDate(x, tz, 'yyyy-MM-dd'); o[c[0]] = String(x); });
    if (def.rol) o.rol = String(r[def.campos.length + 1]);
    const cr = r[ncols_(def) - 2]; o.creada = cr instanceof Date ? cr.toISOString() : String(cr || '');
    return o;
  });
}
function buscarFila_(sh, id) {
  const n = sh.getLastRow() - 1; if (n < 1 || !id) throw new Error('Registro no encontrado');
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  throw new Error('Registro no encontrado (quizá ya fue eliminado)');
}
function buscarUsuario_(sh, u) {
  const n = sh.getLastRow() - 1; if (n < 1) return 0; const x = quitarAcentos_(String(u)).trim();
  const v = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < v.length; i++) if (quitarAcentos_(String(v[i][0])) === x) return i + 2;
  return 0;
}
function proteger_(sh) {
  try {
    if (sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) return;
    const p = sh.protect().setDescription('Se edita desde la plataforma (solo el propietario puede editar aquí)'), yo = Session.getEffectiveUser().getEmail();
    p.getEditors().forEach(function (u) { if (u.getEmail() !== yo) p.removeEditor(u); });
    if (p.canDomainEdit()) p.setDomainEdit(false);
  } catch (e) {}
}

/* =============== Utilidades =============== */
function validar_(def, d) {
  const o = {};
  def.campos.forEach(function (c) {
    const k = c[0], max = c[2], req = c[3], t = c[4] || '';
    let v = t === 'largo' ? String(d[k] == null ? '' : d[k]).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : limpiar_(d[k], max);
    if (t === 'bool') v = (v === 'Sí' || v === 'true' || v === 'on') ? 'Sí' : 'No';
    if (!v && req) throw new Error('Completa el campo «' + c[1] + '»');
    if (v && t === 'url' && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(v)) throw new Error('«' + c[1] + '» debe empezar con http:// o https://');
    if (v && t === 'email' && !v.split(/[;,]\s*/).every(function (m) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m); })) throw new Error('El correo no es válido');
    if (v && t === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('«' + c[1] + '» debe ser una fecha');
    if (v && t.indexOf('enum:') === 0 && t.slice(5).split(',').indexOf(v) < 0) throw new Error('Valor no válido en «' + c[1] + '»');
    if (!v && t === 'enum:General,Importante,Urgente') v = 'General';
    o[k] = v;
  });
  if (o.inicio && o.fin && o.fin < o.inicio) throw new Error('La fecha final no puede ser anterior a la inicial');
  return o;
}
function limpiar_(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
function quitarAcentos_(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function igual_(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < b.length; i++) d |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i); return d === 0; }
function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join(''); }
function hash_(sal, clave) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + '|' + clave, Utilities.Charset.UTF_8)); }
function generarClave_() { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
function avisar_(m) { try { SpreadsheetApp.getUi().alert(m); } catch (e) {} }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
