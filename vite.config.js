import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'


// const certFilePath = 'C:/Users/tecni/Documents/cert/localhost.pem';
// const keyFilePath = 'C:/Users/tecni/Documents/cert/localhost.key';

// let certContent, keyContent;
// try {
//   certContent = fs.readFileSync(certFilePath);
//   keyContent = fs.readFileSync(keyFilePath);
// } catch (error) {
//   console.error('Error reading certificate or key file:', error);
// }
// Read the contents of the PEM file

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // https: {
  //   key: fs.readFileSync(keyFilePath),
  //   cert: fs.readFileSync(certFilePath),
  // },
  server: {
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
    //   cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem'))
    // },
    port: 2086,
//PAO    proxy: {
//PAO      '/service': {
//PAO      target: 'http://test.ecodroneitaly.com',//,'https://fasito.net/', //
//PAO          secure: false,
//PAO          changeOrigin: false
//PAO      },
      // '^/videotest': {
      //     target: 'ws://localhost:5055',
      //     ws: true,
      //     changeOrigin: false
      // }

     host: '0.0.0.00',
	      allowedHosts: [
		            'test.ecodroneitaly.com'
		          ]
 //   }
  }
})
