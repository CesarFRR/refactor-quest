self.onmessage=e=>{if(e.data.type!==`RUN_TESTS`)return;let{code:t,tests:n}=e.data,r=[];for(let e of n)try{let n=`
        ${t}
        ;(function() {
          ${e.fn}
        })();
      `;Function(n)(),r.push({testId:e.id,passed:!0})}catch(t){r.push({testId:e.id,passed:!1,error:t instanceof Error?t.message:String(t)})}self.postMessage({type:`TEST_RESULTS`,results:r})};