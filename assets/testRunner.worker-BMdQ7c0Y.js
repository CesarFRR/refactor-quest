self.onmessage=e=>{let t=e.data;if(t.type===`COMPILE_CHECK`){let e=t.seq;try{Function(t.code),self.postMessage({type:`COMPILE_RESULT`,ok:!0,seq:e})}catch(t){let n=t instanceof Error?t.message:String(t),r=n.match(/line (\d+)|<anonymous>:(\d+)/i),i=r?parseInt(r[1]??r[2],10):void 0;self.postMessage({type:`COMPILE_RESULT`,ok:!1,error:n,errorLine:i,seq:e})}return}if(t.type!==`RUN_TESTS`)return;let{code:n,tests:r}=t,i=[];for(let e of r)try{let t=`
        ${n}
        ;(function() {
          ${e.fn}
        })();
      `;Function(t)(),i.push({testId:e.id,passed:!0})}catch(t){i.push({testId:e.id,passed:!1,error:t instanceof Error?t.message:String(t)})}self.postMessage({type:`TEST_RESULTS`,results:i})};